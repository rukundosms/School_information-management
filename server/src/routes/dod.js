const express = require('express');
const pool = require('../db');
const { requireDodAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireDodAdmin);

router.get('/classes', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT cid, class_name, level, class_code FROM class ORDER BY class_name'
    );
    res.json({ classes: rows });
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

router.get('/terms', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT team AS term FROM marks ORDER BY term');
    const terms = rows.map((r) => r.term).filter((t) => t != null);
    if (terms.length) return res.json({ terms });
  } catch {
    /* ignore */
  }
  try {
    const [rows2] = await pool.query('SELECT DISTINCT term FROM conduct ORDER BY term');
    const terms = rows2.map((r) => r.term).filter((t) => t != null);
    if (terms.length) return res.json({ terms });
  } catch {
    /* ignore */
  }
  res.json({ terms: [1, 2, 3] });
});

router.get('/marks-sheet', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  const yearId = parseInt(req.query.year_id, 10);
  const term = parseInt(req.query.term, 10);
  if (!cid || !yearId || !term) {
    return res.status(400).json({ error: 'cid, year_id, and term required' });
  }
  try {
    const [[cls]] = await pool.query('SELECT * FROM class WHERE cid = ?', [cid]);
    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg
       FROM student_promotion_log spl
       INNER JOIN student s ON s.sid = spl.sid
       WHERE spl.to_class = ? AND spl.to_year = ?
       ORDER BY s.firstname, s.lastname`,
      [cid, yearId]
    );
    let list = students;
    if (!list.length) {
      const [direct] = await pool.query(
        'SELECT sid, firstname, lastname, reg FROM student WHERE class = ? ORDER BY firstname',
        [cid]
      );
      list = direct;
    }

    const rows = [];
    for (const s of list) {
      let conduct = null;
      try {
        const [crows] = await pool.query(
          'SELECT * FROM conduct WHERE sid = ? AND year = ? LIMIT 1',
          [s.sid, yearId]
        );
        conduct = crows[0] || null;
      } catch {
        conduct = null;
      }
      let markVal = null;
      if (conduct) {
        if (term === 1) markVal = conduct.term1;
        else if (term === 2) markVal = conduct.term2;
        else if (term === 3) markVal = conduct.term3;
      }
      rows.push({
        sid: s.sid,
        name: `${s.firstname} ${s.lastname}`,
        reg: s.reg,
        mark: markVal,
        conduct,
      });
    }

    res.json({ classInfo: cls, yearId, term, students: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
