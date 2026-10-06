const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth(['student']));

router.get('/me', async (req, res) => {
  const sid = req.user.sid;
  const classId = req.user.classId;

  try {
    const [studentRows] = await pool.query(
      `SELECT s.*, c.class_name, c.class_code
       FROM student s
       INNER JOIN class c ON s.class = c.cid
       WHERE s.sid = ?
       LIMIT 1`,
      [sid]
    );
    const student = studentRows[0] || {};

    const [[totalAssessments]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE c.cid = ? AND a.status = 'published'`,
      [classId]
    );

    const [[completed]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessment_submissions sub
       INNER JOIN assessments a ON sub.assessment_id = a.assessment_id
       INNER JOIN class c ON a.cid = c.cid
       WHERE sub.sid = ? AND c.cid = ? AND sub.status = 'graded'`,
      [sid, classId]
    );

    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE c.cid = ? AND a.status = 'published' AND a.end_date >= CURDATE()
       AND a.assessment_id NOT IN (SELECT assessment_id FROM assessment_submissions WHERE sid = ?)`,
      [classId, sid]
    );

    const [[upcomingClasses]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid
       WHERE c.cid = ? AND oc.scheduled_date >= CURDATE() AND oc.status = 'scheduled'`,
      [classId]
    );

    const [recent] = await pool.query(
      `SELECT a.*, sub.obtained_marks, sub.status AS submission_status
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id AND sub.sid = ?
       WHERE c.cid = ?
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [sid, classId]
    );

    res.json({
      profile: {
        ...student,
        displayName: req.user.studentName,
        classId,
        className: req.user.className,
        yearId: req.user.yearId,
      },
      stats: {
        totalAssessments: totalAssessments?.cnt ?? 0,
        completed: completed?.cnt ?? 0,
        pending: pending?.cnt ?? 0,
        upcomingClasses: upcomingClasses?.cnt ?? 0,
      },
      recentAssessments: recent,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/notifications', async (req, res) => {
  const sid = req.user.sid;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE sid = ? ORDER BY created_at DESC LIMIT 200',
      [sid]
    );
    const [[{ c }]] = await pool.query(
      'SELECT COUNT(*) AS c FROM notifications WHERE sid = ? AND is_read = 0',
      [sid]
    );
    res.json({ notifications: rows, unread: c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/notifications/:id', async (req, res) => {
  const sid = req.user.sid;
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM notifications WHERE notification_id = ? AND sid = ?', [id, sid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/notifications/clear-read', async (req, res) => {
  const sid = req.user.sid;
  try {
    await pool.query('DELETE FROM notifications WHERE sid = ? AND is_read = 1', [sid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/assessments', async (req, res) => {
  const sid = req.user.sid;
  const studentClassId = req.user.classId;
  const studentClassName = req.user.className;

  try {
    const [actual] = await pool.query(
      'SELECT cid, class_name, class_code FROM class WHERE class_name = ? OR cid = ? LIMIT 1',
      [studentClassName, studentClassId]
    );
    const actualClass = actual[0];
    const actualClassId = actualClass?.cid ?? studentClassId;
    const actualClassName = actualClass?.class_name ?? studentClassName;

    const [assessments] = await pool.query(
      `SELECT a.*,
        (SELECT submission_id FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ?) AS submitted,
        (SELECT obtained_marks FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ?) AS obtained_marks,
        (SELECT status FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ?) AS submission_status,
        (SELECT feedback FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ?) AS feedback,
        (SELECT submission_date FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ?) AS submission_date,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE (c.cid = ? OR c.class_name = ?) AND a.status = 'published'
       ORDER BY a.start_date DESC, a.created_at DESC`,
      [sid, sid, sid, sid, sid, actualClassId, actualClassName]
    );

    res.json({ assessments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes', async (req, res) => {
  const sid = req.user.sid;
  const studentClassId = req.user.classId;
  try {
    const [rows] = await pool.query(
      `SELECT oc.*, t.fname, t.lname,
        (SELECT COUNT(*) FROM attendance att WHERE att.cid = oc.cid AND att.sid = ? AND att.class_date = oc.scheduled_date) AS attended
       FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid
       INNER JOIN teacher t ON oc.tid = t.tid
       WHERE c.cid = ?
       ORDER BY oc.scheduled_date DESC`,
      [sid, studentClassId]
    );
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/results', async (req, res) => {
  const sid = req.user.sid;
  const studentClassId = req.user.classId;
  try {
    const [graded] = await pool.query(
      `SELECT a.*, sub.obtained_marks, sub.feedback, sub.graded_date,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE c.cid = ? AND sub.sid = ? AND sub.status = 'graded'
       ORDER BY sub.graded_date DESC`,
      [studentClassId, sid]
    );
    const [[overall]] = await pool.query(
      `SELECT
        SUM(sub.obtained_marks) AS total_obtained,
        SUM(a.total_marks) AS total_possible,
        AVG((sub.obtained_marks / NULLIF(a.total_marks,0)) * 100) AS avg_percentage,
        COUNT(*) AS total_assessments
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE c.cid = ? AND sub.sid = ? AND sub.status = 'graded'`,
      [studentClassId, sid]
    );
    res.json({ results: graded, overall: overall || {} });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/attendance', async (req, res) => {
  const sid = req.user.sid;
  const studentClassId = req.user.classId;
  try {
    const [records] = await pool.query(
      `SELECT a.*, oc.title AS class_title, oc.start_time, oc.end_time
       FROM attendance a
       LEFT JOIN online_classes oc ON a.cid = oc.cid AND a.class_date = oc.scheduled_date
       WHERE a.sid = ? AND a.cid = ?
       ORDER BY a.class_date DESC
       LIMIT 60`,
      [sid, studentClassId]
    );
    const [monthly] = await pool.query(
      `SELECT
        DATE_FORMAT(class_date, '%Y-%m') AS month,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late
       FROM attendance
       WHERE sid = ? AND cid = ?
       GROUP BY DATE_FORMAT(class_date, '%Y-%m')
       ORDER BY month DESC`,
      [sid, studentClassId]
    );
    res.json({ records, monthly });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profile', async (req, res) => {
  const sid = req.user.sid;
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.class_name, c.class_code
       FROM student s
       INNER JOIN class c ON s.class = c.cid
       WHERE s.sid = ?
       LIMIT 1`,
      [sid]
    );
    res.json({
      profile: rows[0] || null,
      session: {
        name: req.user.studentName,
        className: req.user.className,
        reg: req.user.reg,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/announcements', async (req, res) => {
  const classId = req.user.classId;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, t.fname, t.lname
       FROM announcements a
       INNER JOIN teacher t ON a.tid = t.tid
       WHERE a.cid = ?
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [classId]
    );
    res.json({ announcements: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
