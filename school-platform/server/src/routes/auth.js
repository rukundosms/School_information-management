const express = require('express');
const pool = require('../db');
const { signToken } = require('../util/token');

const router = express.Router();

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
    const position = Number(a.postion);
    if (![1, 2, 3].includes(position)) {
      return res.status(403).json({ error: 'Invalid user position' });
    }

    const token = signToken({
      role: 'admin',
      sub: String(a.id),
      adminId: a.id,
      username: a.username,
      position,
    });

    res.json({
      token,
      user: {
        id: a.id,
        username: a.username,
        position,
        redirect: position === 3 ? 'dod' : 'home',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/student/login', async (req, res) => {
  const studentId = parseInt(req.body?.student_id, 10);
  const classId = parseInt(req.body?.class_id, 10);
  const yearId = parseInt(req.body?.year_id, 10);
  if (!studentId || !classId || !yearId) {
    return res.status(400).json({ error: 'year_id, class_id, and student_id required' });
  }

  try {
    const [viaLog] = await pool.query(
      `SELECT s.*, sp.to_class, sp.to_year, sp.decision, c.class_name, c.class_code
       FROM student s
       INNER JOIN student_promotion_log sp ON s.sid = sp.sid
       INNER JOIN class c ON sp.to_class = c.cid
       WHERE s.sid = ? AND sp.to_class = ? AND sp.to_year = ? AND sp.decision = 'Promoted'
       LIMIT 1`,
      [studentId, classId, yearId]
    );

    let student = viaLog[0];
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
      }
    }

    if (!student) {
      return res.status(401).json({
        error:
          'Invalid login. Ensure you are enrolled in this class for the selected academic year.',
      });
    }

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

    const name = `${student.firstname} ${student.lastname}`;
    const token = signToken({
      role: 'student',
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
      user: {
        sid: student.sid,
        name,
        classId,
        className: student.class_name,
        reg: student.reg,
        programId: student.program_id,
        yearId,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/teacher/status', async (req, res) => {
  const tcode = (req.query.tcode || '').trim();
  if (!tcode) return res.status(400).json({ error: 'tcode required' });

  try {
    const [teachers] = await pool.query('SELECT * FROM teacher WHERE tcode = ? LIMIT 1', [tcode]);
    if (!teachers.length) {
      return res.status(404).json({ error: 'Teacher code not found' });
    }
    const t = teachers[0];
    const [users] = await pool.query('SELECT * FROM user WHERE tcode = ? LIMIT 1', [tcode]);
    const u = users[0];
    const hasPassword = u && u.password != null && String(u.password).length > 0;

    res.json({
      teacher: { tid: t.tid, tcode: t.tcode, fname: t.fname, lname: t.lname },
      userRowExists: !!u,
      hasPassword,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher/init-user', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  if (!tcode) return res.status(400).json({ error: 'tcode required' });

  try {
    const [teachers] = await pool.query('SELECT * FROM teacher WHERE tcode = ? LIMIT 1', [tcode]);
    if (!teachers.length) {
      return res.status(404).json({ error: 'Invalid teacher code' });
    }

    const [existing] = await pool.query('SELECT uid FROM user WHERE tcode = ? LIMIT 1', [tcode]);
    if (existing.length) {
      return res.json({ ok: true, message: 'User row already exists' });
    }

    await pool.query(
      `INSERT INTO user (tcode, password, role, last_activity) VALUES (?, '', 'teacher', NOW())`,
      [tcode]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher/create-password', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  const password = req.body?.password;
  if (!tcode || password == null || password === '') {
    return res.status(400).json({ error: 'tcode and password required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM user WHERE tcode = ? LIMIT 1', [tcode]);
    if (!users.length) {
      await pool.query(
        `INSERT INTO user (tcode, password, role, last_activity) VALUES (?, ?, 'teacher', NOW())`,
        [tcode, password]
      );
    } else if (users[0].password) {
      return res.status(400).json({ error: 'Password already set; login instead' });
    } else {
      await pool.query('UPDATE user SET password = ?, last_activity = NOW() WHERE tcode = ?', [
        password,
        tcode,
      ]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher/login', async (req, res) => {
  const tcode = (req.body?.tcode || '').trim();
  const password = req.body?.password;
  if (!tcode || password == null) {
    return res.status(400).json({ error: 'tcode and password required' });
  }

  try {
    const [teachers] = await pool.query('SELECT * FROM teacher WHERE tcode = ? LIMIT 1', [tcode]);
    if (!teachers.length) {
      return res.status(401).json({ error: 'Invalid teacher code' });
    }
    const t = teachers[0];

    const [users] = await pool.query('SELECT * FROM user WHERE tcode = ? LIMIT 1', [tcode]);
    if (!users.length || !users[0].password) {
      return res.status(401).json({ error: 'Please create a password first' });
    }
    const u = users[0];
    if (u.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [tcode]);

    const token = signToken({
      role: 'teacher',
      sub: String(u.uid),
      uid: u.uid,
      tid: t.tid,
      tcode: t.tcode,
      fname: t.fname,
      lname: t.lname,
    });

    res.json({
      token,
      user: {
        tid: t.tid,
        tcode: t.tcode,
        name: `${t.fname} ${t.lname}`,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
