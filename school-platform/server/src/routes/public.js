const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/school', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT school_name FROM school LIMIT 1');
    res.json({ school_name: rows[0]?.school_name || 'School' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/years', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT year_id, year, status FROM year ORDER BY year_id DESC');
    res.json({ years: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/classes', async (req, res) => {
  const yearId = parseInt(req.query.year_id, 10) || 0;
  if (!yearId) return res.json({ classes: [] });

  try {
    const [fromPromotion] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code
       FROM class c
       INNER JOIN student_promotion_log sp ON c.cid = sp.to_class
       WHERE sp.to_year = ? AND sp.decision = 'Promoted'
       ORDER BY c.class_name ASC`,
      [yearId]
    );

    if (fromPromotion.length) {
      return res.json({ classes: fromPromotion });
    }

    const [all] = await pool.query('SELECT cid, class_name, class_code FROM class ORDER BY class_name ASC');
    res.json({ classes: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/students', async (req, res) => {
  const classId = parseInt(req.query.class_id, 10) || 0;
  const yearId = parseInt(req.query.year_id, 10) || 0;
  if (!classId || !yearId) return res.json({ students: [] });

  try {
    const [fromLog] = await pool.query(
      `SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg, s.program_id
       FROM student s
       INNER JOIN student_promotion_log sp ON s.sid = sp.sid
       WHERE sp.to_class = ? AND sp.to_year = ? AND sp.decision = 'Promoted'
       ORDER BY s.firstname ASC`,
      [classId, yearId]
    );

    if (fromLog.length) {
      const students = fromLog.map((s) => ({
        sid: s.sid,
        name: `${s.firstname} ${s.lastname}`,
        reg: s.reg,
        program_id: s.program_id,
      }));
      return res.json({ students });
    }

    const [direct] = await pool.query(
      'SELECT sid, firstname, lastname, reg, program_id FROM student WHERE class = ? ORDER BY firstname ASC',
      [classId]
    );
    const students = direct.map((s) => ({
      sid: s.sid,
      name: `${s.firstname} ${s.lastname}`,
      reg: s.reg,
      program_id: s.program_id,
    }));
    res.json({ students });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
