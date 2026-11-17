// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { signToken } = require('../util/token');

const router = express.Router();

// ============================================================================
// ✅ Helper: normalize role
// ============================================================================
function normalizeRole(raw) {
  if (!raw) return '';
  return String(raw).toLowerCase().trim();
}

// ============================================================================
// ✅ ADMIN LOGIN
// ============================================================================
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin WHERE username = ? AND password = ? LIMIT 1',
      [username, password]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    const a = rows[0];
    // ✅ FIX: schema has a typo column `postion` — support both spellings
    const position = Number(a.postion ?? a.position);
    if (![1, 2, 3].includes(position)) {
      return res.status(403).json({ error: 'Invalid user position' });
    }

    const token = signToken({
      role: 'admin',           // ✅ top-level, lowercase
      sub: String(a.id),
      adminId: a.id,
      username: a.username,
      position,
    });

    res.json({
      token,
      // ✅ FIX: role added to user object so client-side isAdmin()/isDod() work
      user: {
        role: 'admin',
        id: a.id,
        username: a.username,
        position,
        redirect: position === 3 ? 'dod' : 'home',
      },
    });
  } catch (e) {
    console.error('[admin/login]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ STUDENT LOGIN
// ============================================================================
router.post('/student/login', async (req, res) => {
  const studentId = parseInt(req.body?.student_id, 10);
  const classId = parseInt(req.body?.class_id, 10);
  const yearId = parseInt(req.body?.year_id, 10);

  if (!studentId || !classId || !yearId) {
    return res.status(400).json({
      error: 'year_id, class_id, and student_id are required',
    });
  }

  try {
    // Primary lookup via promotion log
    const [viaLog] = await pool.query(
      `SELECT s.*, sp.to_class, sp.to_year, sp.decision,
              c.class_name, c.class_code
       FROM student s
       INNER JOIN student_promotion_log sp ON s.sid = sp.sid
       INNER JOIN class c ON sp.to_class = c.cid
       WHERE s.sid = ? AND sp.to_class = ? AND sp.to_year = ? AND sp.decision = 'Promoted'
       LIMIT 1`,
      [studentId, classId, yearId]
    );

    let student = viaLog[0];

    // Fallback: direct class assignment
    if (!student) {
      const [direct] = await pool.query(
        `SELECT s.*, c.class_name, c.class_code
         FROM student s
         INNER JOIN class c ON s.class = c.cid
         WHERE s.sid = ? AND s.class = ?
         LIMIT 1`,
        [studentId, classId]
      );
      student = direct[0];
      if (student) {
        student.to_class = classId;
        student.to_year = yearId;
        student.decision = 'Direct';
      }
    }

    if (!student) {
      return res.status(401).json({
        error: 'Invalid login. Ensure you are enrolled in this class for the selected academic year.',
      });
    }

    // Login notification — non-fatal if it fails
    try {
      await pool.query(
        `INSERT INTO notifications (sid, title, message, link, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          student.sid,
          'Login Successful',
          `You logged in at ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
          'student_dashboard.php',
        ]
      );
    } catch (notifErr) {
      console.warn('[student/login] notification insert skipped:', notifErr.message);
    }

    const name = `${student.firstname} ${student.lastname}`.trim();

    const token = signToken({
      role: 'student',        // ✅ top-level, lowercase
      sub: String(student.sid),
      sid: student.sid,
      studentName: name,
      classId,
      className: student.class_name,
      reg: student.reg,
      programId: student.program_id,
      yearId,
    });

    res.json({
      token,
      // ✅ FIX: role added
      user: {
        role: 'student',
        sid: student.sid,
        name,
        classId,
        className: student.class_name,
        reg: student.reg,
        programId: student.program_id,
        yearId,
        redirect: 'student',
      },
    });
  } catch (e) {
    console.error('[student/login]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ TEACHER STATUS (used during onboarding)
// ============================================================================
router.get('/teacher/status', async (req, res) => {
  const tcode = (req.query.tcode || '').trim();
  if (!tcode) return res.status(400).json({ error: 'tcode required' });

  try {
    const [teachers] = await pool.query(
      'SELECT tid, tcode, fname, lname FROM teacher WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    if (!teachers.length) {
      return res.status(404).json({ error: 'Teacher code not found' });
    }
    const t = teachers[0];

    const [users] = await pool.query(
      'SELECT uid, password FROM user WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    const u = users[0];
    const hasPassword = u && u.password != null && String(u.password).length > 0;

    res.json({
      teacher: { tid: t.tid, tcode: t.tcode, fname: t.fname, lname: t.lname },
      userRowExists: !!u,
      hasPassword,
    });
  } catch (e) {
    console.error('[teacher/status]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ TEACHER INIT USER (first-time setup)
// ============================================================================
router.post('/teacher/init-user', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  if (!tcode) return res.status(400).json({ error: 'tcode required' });

  try {
    const [teachers] = await pool.query(
      'SELECT tid FROM teacher WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    if (!teachers.length) {
      return res.status(404).json({ error: 'Invalid teacher code' });
    }

    const [existing] = await pool.query(
      'SELECT uid FROM user WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    if (existing.length) {
      return res.json({ ok: true, message: 'User row already exists' });
    }

    await pool.query(
      `INSERT INTO user (tcode, password, role, last_activity)
       VALUES (?, '', 'teacher', NOW())`,
      [tcode]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[teacher/init-user]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ TEACHER CREATE PASSWORD (first-time setup)
// ============================================================================
router.post('/teacher/create-password', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  const password = req.body?.password;
  if (!tcode || password == null || password === '') {
    return res.status(400).json({ error: 'tcode and password required' });
  }

  try {
    const [users] = await pool.query(
      'SELECT uid, password FROM user WHERE tcode = ? LIMIT 1',
      [tcode]
    );

    if (!users.length) {
      await pool.query(
        `INSERT INTO user (tcode, password, role, last_activity)
         VALUES (?, ?, 'teacher', NOW())`,
        [tcode, password]
      );
    } else if (users[0].password) {
      return res.status(400).json({ error: 'Password already set; login instead' });
    } else {
      await pool.query(
        'UPDATE user SET password = ?, last_activity = NOW() WHERE tcode = ?',
        [password, tcode]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[teacher/create-password]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ TEACHER LOGIN — THE MAIN EVENT
// ============================================================================
router.post('/teacher/login', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  const password = req.body?.password;

  if (!tcode || password == null) {
    return res.status(400).json({ error: 'tcode and password required' });
  }

  try {
    // 1. Verify teacher exists
    const [teachers] = await pool.query(
      'SELECT tid, tcode, fname, lname FROM teacher WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    if (!teachers.length) {
      return res.status(401).json({ error: 'Invalid teacher code' });
    }
    const t = teachers[0];

    // 2. Load user row for password check
    const [users] = await pool.query(
      'SELECT uid, tcode, password FROM user WHERE tcode = ? LIMIT 1',
      [tcode]
    );
    if (!users.length || !users[0].password) {
      return res.status(401).json({ error: 'Please create a password first' });
    }
    const u = users[0];

    // 3. Compare password
    // ⚠️ Currently plaintext. Once you migrate to bcrypt, replace this with
    //    `await bcrypt.compare(password, u.password)`.
    if (String(u.password) !== String(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 4. Update last activity
    try {
      await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [tcode]);
    } catch { /* non-fatal */ }

    // 5. Sign token with EVERYTHING downstream routes need
    const fullName = `${t.fname || ''} ${t.lname || ''}`.trim() || 'Teacher';

    const token = signToken({
      role: 'teacher',        // ✅ top-level, lowercase, exact match
      sub: String(u.uid),
      uid: u.uid,
      tid: t.tid,             // ✅ required by ALL teacher routes
      tcode: t.tcode,
      fname: t.fname,
      lname: t.lname,
      name: fullName,
    });

    // 6. Respond with token + full user object
    res.json({
      token,
      // ✅ FIX: role, tid, tcode, fname, lname all in user object
      user: {
        role: 'teacher',
        tid: t.tid,
        uid: u.uid,
        tcode: t.tcode,
        fname: t.fname,
        lname: t.lname,
        name: fullName,
        redirect: 'teacher',
      },
      // ✅ Also include teacher object for client-side caching
      teacher: {
        tid: t.tid,
        tcode: t.tcode,
        fname: t.fname,
        lname: t.lname,
      },
    });
  } catch (e) {
    console.error('[teacher/login]', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ✅ NEW: /whoami — instant diagnostic for 401/403 debugging
// ============================================================================
router.get('/whoami', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'No token',
      hint: 'Send Authorization: Bearer <token>',
      header_received: auth ? 'present but malformed' : 'missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      ok: true,
      decoded,
      checks: {
        has_role: !!decoded.role,
        role_value: normalizeRole(decoded.role),
        role_is_teacher: normalizeRole(decoded.role) === 'teacher',
        role_is_student: normalizeRole(decoded.role) === 'student',
        role_is_admin: normalizeRole(decoded.role) === 'admin',
        has_tid: !!decoded.tid,
        has_sid: !!decoded.sid,
        has_tcode: !!decoded.tcode,
        has_position: decoded.position !== undefined && decoded.position !== null,
        expires_in_seconds: decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : null,
        expired: decoded.exp ? decoded.exp < Math.floor(Date.now() / 1000) : false,
      },
    });
  } catch (err) {
    res.status(401).json({
      error: 'Invalid token',
      detail: err.message,
      hint: err.name === 'TokenExpiredError'
        ? 'Token has expired — log in again'
        : err.name === 'JsonWebTokenError'
        ? 'JWT_SECRET mismatch or corrupted token'
        : 'Unknown verification error',
    });
  }
});

// ============================================================================
// ✅ NEW: /debug/verify — POST the token in body if headers are problematic
// ============================================================================
router.post('/debug/verify', (req, res) => {
  const token = req.body?.token || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(400).json({ error: 'token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, decoded });
  } catch (err) {
    res.json({ valid: false, error: err.message, name: err.name });
  }
});

module.exports = router;