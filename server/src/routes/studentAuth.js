// server/src/routes/studentAuth.js
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[studentAuth] JWT_SECRET is not set — student login will fail.');
}

const TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------- ticket helpers ----------
function signTicket(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}

function verifyTicket(ticket) {
  if (typeof ticket !== 'string') return null;
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload?.exp || Date.now() > payload.exp) return null;
  return payload;
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

// ---------- rate limiters ----------
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: 'Too many lookup attempts. Please wait a minute.' },
  standardHeaders: true, legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: 'Too many login attempts. Please wait a minute.' },
  standardHeaders: true, legacyHeaders: false,
});

// ============================================================
// Shared SQL: resolve a student's current class in a year.
// Sources, in priority order:
//   1. student_promotion_log → latest to_year = <year_id>
//   2. student.class if student.registed_year = <year_id>
// `reg` is now VARCHAR(32), so direct equality is safe.
// ============================================================
const LOOKUP_SQL = `
  SELECT
    s.sid,
    s.reg,
    s.firstname,
    c.cid,
    c.class_name,
    c.level
  FROM student s
  INNER JOIN class c ON c.cid = COALESCE(
    (SELECT spl.to_class
       FROM student_promotion_log spl
      WHERE spl.sid = s.sid
        AND spl.to_year = ?
      ORDER BY spl.created_at DESC
      LIMIT 1),
    CASE WHEN s.registed_year = ? THEN s.class ELSE NULL END
  )
  WHERE s.reg = ?
  LIMIT 1
`;

// ============================================================
// STEP 1: LOOKUP BY REG NUMBER
// POST /api/auth/student/lookup  { year_id, reg }
// ============================================================
router.post('/lookup', lookupLimiter, async (req, res) => {
  const { year_id, reg } = req.body || {};
  if (!year_id || reg === undefined || reg === null || reg === '') {
    return res.status(400).json({ error: 'year_id and reg are required.' });
  }

  const yearIdNum = Number(year_id);
  const regStr = String(reg).trim();
  if (!Number.isInteger(yearIdNum)) {
    return res.status(400).json({ error: 'Invalid year_id.' });
  }
  if (regStr.length === 0 || regStr.length > 32) {
    return res.status(400).json({ error: 'Invalid registration number.' });
  }

  try {
    const [rows] = await pool.query(LOOKUP_SQL, [yearIdNum, yearIdNum, regStr]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No active student found for that registration number in the selected year.',
      });
    }

    const s = rows[0];
    const first = String(s.firstname || '').trim();
    const firstname_masked = first
      ? `${first[0]}${'•'.repeat(Math.max(0, first.length - 1))}`
      : '';

    const ticket = signTicket({
      sid: s.sid,
      year_id: yearIdNum,
      reg: String(s.reg),   // stored as string now
      exp: Date.now() + TICKET_TTL_MS,
    });

    return res.json({
      login_ticket: ticket,
      student: {
        sid: s.sid,
        reg: s.reg,          // string
        firstname_masked,
      },
      class: {
        cid: s.cid,
        level: s.level ?? null,
        class_name: s.class_name,
      },
    });
  } catch (e) {
    console.error('[studentAuth/lookup] error:', e);
    return res.status(500).json({
      error: 'Lookup failed.',
      detail: process.env.NODE_ENV !== 'production' ? (e.sqlMessage || e.message) : undefined,
    });
  }
});

// ============================================================
// STEP 2: LOGIN WITH FIRST NAME
// POST /api/auth/student/login  { year_id, login_ticket, first_name }
// ============================================================
router.post('/login', loginLimiter, async (req, res) => {
  const { year_id, login_ticket, first_name } = req.body || {};
  if (!year_id || !login_ticket || !first_name) {
    return res.status(400).json({
      error: 'year_id, login_ticket, and first_name are required.',
    });
  }

  const payload = verifyTicket(login_ticket);
  if (!payload) {
    return res.status(400).json({
      error: 'Login session expired. Please look up your RegNo again.',
    });
  }
  if (Number(payload.year_id) !== Number(year_id)) {
    return res.status(400).json({ error: 'Login ticket does not match the selected year.' });
  }

  try {
    const [rows] = await pool.query(LOOKUP_SQL, [
      Number(year_id),
      Number(year_id),
      String(payload.reg),
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student no longer enrolled in that year.' });
    }

    const s = rows[0];
    if (s.sid !== payload.sid) {
      return res.status(400).json({ error: 'Login ticket mismatch.' });
    }

    if (normalizeName(s.firstname) !== normalizeName(first_name)) {
      return res.status(401).json({ error: 'First name does not match our records.' });
    }

    // Year label — table is `year`
    let yearLabel = '';
    try {
      const [yrows] = await pool.query(
        'SELECT year FROM year WHERE year_id = ? LIMIT 1',
        [year_id]
      );
      yearLabel = yrows[0]?.year || '';
    } catch { /* ignore */ }

    const [sname] = await pool.query(
      'SELECT firstname, lastname FROM student WHERE sid = ? LIMIT 1',
      [s.sid]
    );
    const fullName = sname[0]
      ? `${sname[0].firstname || ''} ${sname[0].lastname || ''}`.trim()
      : '';

    const token = jwt.sign(
      {
        sid: s.sid,
        reg: s.reg,
        role: 'student',
        classId: s.cid,
        className: s.class_name,
        level: s.level ?? null,
        yearId: Number(year_id),
        studentName: fullName,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        sid: s.sid,
        reg: s.reg,
        role: 'student',
        studentName: fullName,
        classId: s.cid,
        className: s.class_name,
        level: s.level ?? null,
        yearId: Number(year_id),
        year: yearLabel,
      },
    });
  } catch (e) {
    console.error('[studentAuth/login] error:', e);
    return res.status(500).json({
      error: 'Login failed.',
      detail: process.env.NODE_ENV !== 'production' ? (e.sqlMessage || e.message) : undefined,
    });
  }
});

module.exports = router;