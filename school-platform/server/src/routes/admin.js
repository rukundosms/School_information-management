const express = require('express');
const pool = require('../db');
const { requireAdminFull } = require('../middleware/auth');
const adminEntities = require('./adminEntities');

const router = express.Router();
router.use(requireAdminFull);

router.get('/dashboard', async (req, res) => {
  try {
    const [yearRows] = await pool.query(
      `SELECT year_id, year FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1`
    );
    const currentYearId = yearRows[0]?.year_id;

    const [years] = await pool.query(`SELECT year_id, year FROM year ORDER BY year DESC LIMIT 5`);

    const [teachers] = await pool.query(
      `SELECT tid, fname, lname, tcode FROM teacher ORDER BY fname LIMIT 100`
    );

    const [modules] = await pool.query(`SELECT moid, mname FROM module ORDER BY mname LIMIT 100`);

    let classes = [];
    if (currentYearId) {
      const [classRows] = await pool.query(
        `SELECT DISTINCT c.cid, c.class_name, c.level
         FROM class c
         INNER JOIN student_promotion_log spl ON spl.to_class = c.cid
         WHERE spl.to_year = ?
         ORDER BY c.class_name
         LIMIT 50`,
        [currentYearId]
      );
      classes = classRows;
    }

    const [[counts]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM class) AS total_classes,
        (SELECT COUNT(DISTINCT s.sid) FROM student s
          INNER JOIN student_promotion_log spl ON s.sid = spl.sid
          WHERE s.status = 'Active' AND spl.to_year = ?) AS total_students,
        (SELECT COUNT(*) FROM teacher) AS total_teachers,
        (SELECT COUNT(*) FROM module) AS total_modules`,
      [currentYearId || 0]
    );

    const activeLimit = new Date(Date.now() - 10 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [activeNow] = await pool.query(
      `SELECT u.uid, u.tcode, u.role, u.last_activity, t.fname, t.lname,
        CONCAT(COALESCE(t.fname, ''), ' ', COALESCE(t.lname, '')) AS user_name,
        TIMESTAMPDIFF(MINUTE, u.last_activity, NOW()) AS minutes_ago,
        DATE_FORMAT(u.last_activity, '%h:%i %p') AS formatted_time
       FROM user u
       LEFT JOIN teacher t ON u.tcode = t.tcode
       WHERE u.last_activity IS NOT NULL AND u.last_activity >= ?
       ORDER BY u.last_activity DESC`,
      [activeLimit]
    );

    res.json({
      currentYear: yearRows[0] || null,
      years,
      teachers,
      modules,
      classes,
      stats: counts || {},
      activeNow,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/classes-all', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cid, class_name, level, class_code FROM class ORDER BY class_name`
    );
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use(adminEntities);

module.exports = router;
