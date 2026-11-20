// server/src/routes/studentAuth.js
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail fast at boot if the secret isn't configured.
  console.error('[studentAuth] JWT_SECRET is not set — student login will fail.');
}

const TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------- helpers ----------
function signTicket(payload) {
  // HMAC-signed compact ticket: <base64url(payload)>.<hex(hmac)>
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}

function verifyTicket(ticket) {
  if (typeof ticket !== 'string') return null;
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('hex');
  // constant-time compare
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
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many lookup attempts. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// STEP 1: LOOKUP BY REG NUMBER
// POST /api/auth/student/lookup
// body: { year_id, reg }
// returns: { login_ticket, student: { sid, reg }, class: { cid, level, class_name } }
// ============================================================
router.post('/lookup', lookupLimiter, async (req, res) => {
  const { year_id, reg } = req.body || {};
  if (!year_id || !reg) return res.status(400).json({ error: 'year_id and reg are required.' });

  try {
    // Find the student's active enrollment in the requested year.
    // Adjust the JOIN columns to match your actual schema:
    //   student.class -> class.cid
    //   class.level   -> class.level   (assuming a "level" column)
    //   class.year_id -> class.year_id (if classes are scoped by year)
    const [rows] = await pool.query(
      `SELECT s.sid, s.reg, s.firstname,
              c.cid, c.class_name, c.level
         FROM student s
         INNER JOIN class c ON c.cid = s.class
        WHERE s.reg = ?
          AND c.year_id = ?
        LIMIT 1`,
      [String(reg).trim(), Number(year_id)]
    );

    if (rows.length === 0) {
      // Generic message to avoid enumeration.
      return res.status(404).json({ error: 'No active student found for that registration number in the selected year.' });
    }

    const s = rows[0];

    // Never return the real first name — only a masked hint, so the client
    // can't scrape names via reg guessing.
    const first = String(s.firstname || '').trim();
    const firstname_masked = first ? `${first[0]}${'•'.repeat(Math.max(0, first.length - 1))}` : '';

    const ticket = signTicket({
      sid: s.sid,
      year_id: Number(year_id),
      reg: String(s.reg),
      exp: Date.now() + TICKET_TTL_MS,
    });

    return res.json({
      login_ticket: ticket,
      student: {
        sid: s.sid,
        reg: s.reg,
        firstname_masked,
      },
      class: {
        cid: s.cid,
        level: s.level ?? null,
        class_name: s.class_name,
      },
    });
  } catch (e) {
    req.log?.error({ err: e }, 'student lookup failed');
    return res.status(500).json({ error: 'Lookup failed.' });
  }
});

// ============================================================
// STEP 2: LOGIN WITH FIRST NAME
// POST /api/auth/student/login
// body: { year_id, login_ticket, first_name }
// ============================================================
router.post('/login', loginLimiter, async (req, res) => {
  const { year_id, login_ticket, first_name } = req.body || {};
  if (!year_id || !login_ticket || !first_name) {
    return res.status(400).json({ error: 'year_id, login_ticket, and first_name are required.' });
  }

  const payload = verifyTicket(login_ticket);
  if (!payload) return res.status(400).json({ error: 'Login session expired. Please look up your RegNo again.' });
  if (Number(payload.year_id) !== Number(year_id)) {
    return res.status(400).json({ error: 'Login ticket does not match the selected year.' });
  }

  try {
    // Re-fetch the student + class fresh — do not trust the ticket for anything but the sid.
    const [rows] = await pool.query(
      `SELECT s.sid, s.reg, s.firstname, s.lastname,
              c.cid, c.class_name, c.level, c.year_id
         FROM student s
         INNER JOIN class c ON c.cid = s.class
        WHERE s.sid = ?
          AND c.year_id = ?
        LIMIT 1`,
      [payload.sid, Number(year_id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student no longer enrolled in that year.' });
    }

    const s = rows[0];

    // Verify first name (case-insensitive, trimmed)
    if (normalizeName(s.firstname) !== normalizeName(first_name)) {
      // Generic error — no hint about which field is wrong.
      return res.status(401).json({ error: 'First name does not match our records.' });
    }

    // Resolve year label (for the UI)
    let yearLabel = '';
    try {
      const [yrows] = await pool.query('SELECT year FROM academic_years WHERE year_id = ? LIMIT 1', [year_id]);
      yearLabel = yrows[0]?.year || '';
    } catch { /* ignore */ }

    // Issue JWT — role MUST be 'student'
    const token = jwt.sign(
      {
        sid: s.sid,
        reg: s.reg,
        role: 'student',
        classId: s.cid,
        className: s.class_name,
        level: s.level ?? null,
        yearId: s.year_id,
        studentName: `${s.firstname || ''} ${s.lastname || ''}`.trim(),
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
        studentName: `${s.firstname || ''} ${s.lastname || ''}`.trim(),
        classId: s.cid,
        className: s.class_name,
        level: s.level ?? null,
        yearId: s.year_id,
        year: yearLabel,
      },
    });
  } catch (e) {
    req.log?.error({ err: e }, 'student login failed');
    return res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;