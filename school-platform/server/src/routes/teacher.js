const express = require('express');
const pool = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All teacher routes require an authenticated teacher (JWT-based)
router.use(requireAuth(['teacher']));

// ============ HEALTH CHECK ============
router.get('/__ping', (req, res) => {
  res.json({
    ok: true,
    file: __filename,
    when: new Date().toISOString(),
    user: req.user || null,
  });
});

// ============ TEACHER CLASS PICKER ============
router.get('/teacher-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code
       FROM class c
       INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ?
       ORDER BY c.level, c.class_name`,
      [tid]
    );
    res.json({ classes });
  } catch (e) {
    console.error('Teacher classes error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ DEBUG ============
router.get('/debug-routes', (req, res) => {
  const routes = [];
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} ${layer.route.path}`);
    }
  });
  res.json({ count: routes.length, routes });
});

// ============ ME ============
router.get('/me', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM teacher WHERE tid = ? LIMIT 1', [req.user.tid]);
    const teacher = rows[0];
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [teacher.tcode]);
    res.json({ teacher });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ASSESSMENT MANAGEMENT ============
router.get('/assessments', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM assessment_submissions WHERE assessment_id = a.assessment_id AND status IN ('submitted','graded')) AS total_submissions,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions
       FROM assessments a
       WHERE a.tid = ?
       ORDER BY a.created_at DESC`,
      [tid]
    );
    res.json({ assessments: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MY CLASSES ============
router.get('/my-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [[active]] = await pool.query(
      "SELECT year_id FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1"
    );
    const yearId = active?.year_id || 0;

    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code,
        (
          SELECT COUNT(DISTINCT s.sid)
          FROM student s
          INNER JOIN student_promotion_log spl ON s.sid = spl.sid
          WHERE spl.to_class = c.cid AND spl.to_year = ? AND s.status = 'Active'
        ) AS student_count
       FROM permision p
       INNER JOIN class c ON p.cid = c.cid
       WHERE p.tid = ?
       ORDER BY c.level, c.class_name`,
      [yearId, tid]
    );

    for (const cls of classes) {
      const [modules] = await pool.query(
        `SELECT DISTINCT m.moid, m.mname, m.mcode
         FROM module m
         INNER JOIN permision p ON m.moid = p.mid
         WHERE p.tid = ? AND p.cid = ?
         ORDER BY m.mname`,
        [tid, cls.cid]
      );
      cls.modules = modules;
    }

    res.json({ classes, yearId });
  } catch (e) {
    console.error('My classes error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ DASHBOARD ============
router.get('/dashboard', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [[classCount]] = await pool.query(
      'SELECT COUNT(DISTINCT cid) as total FROM permision WHERE tid = ?',
      [tid]
    );
    const [[moduleCount]] = await pool.query(
      'SELECT COUNT(DISTINCT mid) as total FROM permision WHERE tid = ?',
      [tid]
    );
    const [[studentCount]] = await pool.query(
      `SELECT COUNT(DISTINCT s.sid) as total
       FROM student s
       INNER JOIN permision p ON s.class = p.cid
       WHERE p.tid = ? AND s.status = 'Active'`,
      [tid]
    );

    let onlineCount = { total: 0 };
    try {
      const [[result]] = await pool.query(
        `SELECT COUNT(*) as total FROM online_classes
         WHERE tid = ? AND status IN ('scheduled', 'ongoing')`,
        [tid]
      );
      onlineCount = result;
    } catch (err) { /* table may not exist */ }

    res.json({
      stats: {
        totalClasses: classCount?.total || 0,
        totalModules: moduleCount?.total || 0,
        totalStudents: studentCount?.total || 0,
        pendingAssessments: 0,
        onlineClasses: onlineCount?.total || 0,
        attendanceRate: 0
      },
      recentClasses: []
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ ANNOUNCEMENTS ============
router.get('/announcements', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.class_name
       FROM announcements a
       JOIN class c ON a.cid = c.cid
       WHERE a.tid = ?
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [tid]
    );
    res.json({ announcements: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ONLINE CLASSES ============
router.get('/online-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT oc.*, c.class_name, c.class_code, c.level
       FROM online_classes oc
       JOIN class c ON oc.cid = c.cid
       WHERE oc.tid = ?
       ORDER BY oc.scheduled_date DESC, oc.start_time DESC`,
      [tid]
    );
    res.json({ classes: rows });
  } catch (e) {
    console.error('Error fetching online classes:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id/waiting-room', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [students] = await pool.query(
      `SELECT wr.*, s.firstname, s.lastname, s.reg,
              TIMESTAMPDIFF(MINUTE, wr.requested_at, NOW()) as minutes_waiting
       FROM online_class_waiting_room wr
       INNER JOIN student s ON wr.sid = s.sid
       WHERE wr.online_class_id = ? AND wr.status = 'pending'
       ORDER BY wr.requested_at ASC`,
      [classId]
    );
    res.json({ students });
  } catch (e) {
    console.error('Waiting room error:', e);
    res.json({ students: [] });
  }
});

router.post('/online-classes/:id/approve-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(400).json({ error: 'Student ID required' });
  try {
    await pool.query(
      `UPDATE online_class_waiting_room SET status='approved', approved_at=NOW()
       WHERE online_class_id = ? AND sid = ?`,
      [classId, sid]
    );
    try {
      await pool.query(
        `INSERT INTO online_class_attendance (online_class_id, sid, joined_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE joined_at = NOW()`,
        [classId, sid]
      );
    } catch (attErr) { console.warn('Attendance insert error:', attErr.message); }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/online-classes/:id/reject-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(400).json({ error: 'Student ID required' });
  try {
    await pool.query(
      `UPDATE online_class_waiting_room SET status='rejected', rejected_at=NOW()
       WHERE online_class_id = ? AND sid = ?`,
      [classId, sid]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [messages] = await pool.query(
      `SELECT cm.*,
              CASE WHEN cm.sender_type = 'teacher'
                THEN (SELECT CONCAT(fname, ' ', lname) FROM teacher WHERE tid = cm.sender_id)
                ELSE (SELECT CONCAT(firstname, ' ', lastname) FROM student WHERE sid = cm.sender_id)
              END as sender_name,
              CASE WHEN cm.sender_type = 'teacher' THEN 1 ELSE 0 END as is_teacher
       FROM online_class_chat cm
       WHERE cm.online_class_id = ?
       ORDER BY cm.created_at ASC
       LIMIT 200`,
      [classId]
    );
    res.json({ messages });
  } catch (e) {
    res.json({ messages: [] });
  }
});

router.post('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { message } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    await pool.query(
      `INSERT INTO online_class_chat (online_class_id, sender_id, sender_type, message, created_at)
       VALUES (?, ?, 'teacher', ?, NOW())`,
      [classId, req.user.tid, message.trim()]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id/assessments', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [classes] = await pool.query('SELECT cid, tid FROM online_classes WHERE class_id = ?', [classId]);
    if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });
    const [assessments] = await pool.query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as questions_count
       FROM assessments a
       WHERE a.cid = ? AND a.tid = ?
       ORDER BY a.created_at DESC`,
      [classes[0].cid, classes[0].tid]
    );
    res.json({ assessments });
  } catch (e) {
    res.json({ assessments: [] });
  }
});

router.post('/online-classes/:id/send-assessment', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { assessment_id } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!assessment_id) return res.status(400).json({ error: 'Assessment ID required' });
  try {
    const [classes] = await pool.query('SELECT cid FROM online_classes WHERE class_id = ?', [classId]);
    if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });
    const [students] = await pool.query(
      `SELECT s.sid FROM student s WHERE s.class = ? AND s.status = 'Active'`,
      [classes[0].cid]
    );
    if (students.length === 0) return res.status(404).json({ error: 'No active students' });

    let assigned = 0;
    for (const student of students) {
      try {
        await pool.query(
          `INSERT INTO assessment_submissions (assessment_id, online_class_id, sid, submission_date, status)
           VALUES (?, ?, ?, NOW(), 'pending')
           ON DUPLICATE KEY UPDATE online_class_id = VALUES(online_class_id), submission_date = VALUES(submission_date)`,
          [assessment_id, classId, student.sid]
        );
        assigned++;
      } catch (err) { console.warn('Assign error:', err.message); }
    }
    res.json({ ok: true, sent_to: assigned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/online-classes/:id/start', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [r] = await pool.query(
      `UPDATE online_classes SET status='ongoing' WHERE class_id = ? AND tid = ?`,
      [classId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true, message: 'Class started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/online-classes/:id/end', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [r] = await pool.query(
      `UPDATE online_classes SET status='completed' WHERE class_id = ? AND tid = ?`,
      [classId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true, message: 'Class ended' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id/attendance', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [attendance] = await pool.query(
      `SELECT oca.*, s.firstname, s.lastname, s.reg
       FROM online_class_attendance oca
       INNER JOIN student s ON oca.sid = s.sid
       WHERE oca.online_class_id = ?
       ORDER BY oca.joined_at ASC`,
      [classId]
    );
    res.json({ attendance });
  } catch (e) {
    res.json({ attendance: [] });
  }
});

router.put('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const { title, description, meeting_link, meeting_id, meeting_password,
            scheduled_date, start_time, end_time, duration_minutes, status } = req.body;
    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      duration = Math.round((end - start) / 60000);
    }
    const [r] = await pool.query(
      `UPDATE online_classes
       SET title=?, description=?, meeting_link=?, meeting_id=?, meeting_password=?,
           scheduled_date=?, start_time=?, end_time=?, duration_minutes=?, status=?
       WHERE class_id = ? AND tid = ?`,
      [title?.trim(), description?.trim() || null, meeting_link?.trim(),
       meeting_id?.trim() || null, meeting_password?.trim() || null,
       scheduled_date, start_time, end_time, duration || null,
       status || 'scheduled', classId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true, message: 'Class updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [r] = await pool.query(
      'DELETE FROM online_classes WHERE class_id = ? AND tid = ?',
      [classId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true, message: 'Class deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query(
      `SELECT oc.*, c.class_name, c.class_code, c.level
       FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid
       WHERE oc.class_id = ? AND oc.tid = ?`,
      [classId, req.user.tid]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/online-classes/:classId/cancel', async (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class id' });
  try {
    const [r] = await pool.query(
      `UPDATE online_classes SET status='cancelled' WHERE class_id = ? AND tid = ?`,
      [classId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ SCHEDULE CLASS ============
router.post('/schedule-class', async (req, res) => {
  const { cid, title, description, meeting_link, meeting_id, meeting_password,
          scheduled_date, start_time, end_time, duration_minutes } = req.body;
  if (!cid || !title || !meeting_link || !scheduled_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!/^https?:\/\/.+/.test(meeting_link)) {
    return res.status(400).json({ error: 'Invalid meeting link URL' });
  }
  try {
    const tid = req.user.tid;
    const [perms] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ?', [tid, cid]);
    if (perms.length === 0) return res.status(403).json({ error: 'No permission for this class' });

    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      duration = Math.round((end - start) / 60000);
    }
    const [r] = await pool.query(
      `INSERT INTO online_classes
       (cid, tid, title, description, meeting_link, meeting_id, meeting_password,
        scheduled_date, start_time, end_time, duration_minutes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [cid, tid, title.trim(), description?.trim() || null,
       meeting_link.trim(), meeting_id?.trim() || null, meeting_password?.trim() || null,
       scheduled_date, start_time, end_time, duration || null]
    );
    res.json({ ok: true, classId: r.insertId, message: 'Class scheduled' });
  } catch (e) {
    console.error('Error scheduling class:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ ASSESSMENT CLASSES ============
router.get('/assessment-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code, c.level
       FROM permision p
       INNER JOIN class c ON p.cid = c.cid
       WHERE p.tid = ?
       ORDER BY c.class_name`,
      [tid]
    );
    res.json({ classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ CREATE ASSESSMENT ============
router.post('/create-assessment', async (req, res) => {
  const { cid, title, description, assessment_type, total_marks, passing_marks,
          duration_minutes, start_date, start_time, end_date, end_time,
          instructions, allow_late_submission, show_results_immediately } = req.body;
  if (!cid || !title || !assessment_type || !total_marks || !passing_marks) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!start_date || !start_time || !end_date || !end_time) {
    return res.status(400).json({ error: 'Start and end date/time required' });
  }
  const startDt = new Date(`${start_date}T${start_time}`);
  const endDt = new Date(`${end_date}T${end_time}`);
  if (endDt <= startDt) return res.status(400).json({ error: 'End must be after start' });
  if (parseInt(passing_marks) > parseInt(total_marks)) {
    return res.status(400).json({ error: 'Passing marks cannot exceed total' });
  }
  try {
    const tid = req.user.tid;
    const [perms] = await pool.query('SELECT gid FROM permision WHERE tid = ? AND cid = ?', [tid, cid]);
    if (perms.length === 0) return res.status(403).json({ error: 'No permission' });

    const [r] = await pool.query(
      `INSERT INTO assessments
       (cid, tid, title, description, assessment_type, total_marks, passing_marks,
        duration_minutes, start_date, start_time, end_date, end_time, instructions,
        status, allow_late_submission, show_results_immediately)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [cid, tid, title.trim(), description?.trim() || null, assessment_type,
       parseInt(total_marks), parseInt(passing_marks),
       duration_minutes ? parseInt(duration_minutes) : null,
       start_date, start_time, end_date, end_time,
       instructions?.trim() || null,
       allow_late_submission ? 1 : 0, show_results_immediately ? 1 : 0]
    );
    res.json({ ok: true, assessment_id: r.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ASSESSMENT QUESTIONS ============
router.post('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const { question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks } = req.body;
  if (!question_type || !question_text || !marks) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [a] = await pool.query('SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?',
      [assessmentId, req.user.tid]);
    if (a.length === 0) return res.status(404).json({ error: 'Assessment not found' });

    const [r] = await pool.query(
      `INSERT INTO assessment_questions
       (assessment_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assessmentId, question_type, question_text.trim(),
       option_a?.trim() || null, option_b?.trim() || null,
       option_c?.trim() || null, option_d?.trim() || null,
       correct_answer?.trim() || null, parseInt(marks)]
    );
    res.json({ ok: true, question_id: r.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  try {
    const [rows] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );
    res.json({ questions: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/assessment-questions/:id', async (req, res) => {
  const qid = parseInt(req.params.id, 10);
  if (!qid) return res.status(400).json({ error: 'Invalid question ID' });
  try {
    const [r] = await pool.query('DELETE FROM assessment_questions WHERE question_id = ?', [qid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/assessments/:id/publish', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM assessment_questions WHERE assessment_id = ?',
      [assessmentId]
    );
    if (total === 0) return res.status(400).json({ error: 'Cannot publish with no questions' });

    const [r] = await pool.query(
      `UPDATE assessments SET status='published' WHERE assessment_id = ? AND tid = ?`,
      [assessmentId, req.user.tid]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Assessment not found' });
    res.json({ ok: true, message: 'Assessment published' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ GRADE SUBMISSIONS ============
function extractCorrectLetter(correctAnswer) {
  if (!correctAnswer) return '';
  const str = String(correctAnswer).trim();
  const m = str.toUpperCase().match(/^([A-Z])[\.\s\)]/);
  if (m) return m[1];
  if (str.length === 1 && /^[A-Za-z]$/.test(str)) return str.toUpperCase();
  const tf = str.toLowerCase();
  if (tf === 'true' || tf === 'false') return tf.charAt(0).toUpperCase() + tf.slice(1);
  return str;
}

router.get('/assessments/:id/grade', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name, c.class_code, c.level
       FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks
       FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );
    const questionMap = {};
    questions.forEach(q => { questionMap[q.question_id] = q; });

    const [submissions] = await pool.query(
      `SELECT sub.*, s.firstname, s.lastname, s.reg
       FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid
       WHERE sub.assessment_id = ?
       ORDER BY sub.submission_date ASC`,
      [assessmentId]
    );

    const submissionsData = submissions.map(sub => {
      let answers = [];
      try { answers = sub.answers ? JSON.parse(sub.answers) : []; if (!Array.isArray(answers)) answers = []; } catch { answers = []; }

      let autoScore = 0, correctCount = 0, wrongCount = 0, unansweredCount = 0;
      const processedAnswers = answers.map(answer => {
        const qid = answer.qid;
        const q = questionMap[qid];
        if (!q) return answer;
        const userAnswer = answer.user_answer ?? answer.answer ?? '';
        const userLetter = answer.user_letter ?? '';
        const hasAnswer = userAnswer !== '' && userAnswer !== null && userAnswer !== undefined;
        if (!hasAnswer) unansweredCount++;
        if (answer.is_correct !== undefined && answer.is_correct !== null) {
          if (answer.is_correct) { correctCount++; autoScore += answer.obtained ?? q.marks; }
          else if (hasAnswer) wrongCount++;
          return answer;
        }
        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
          let isCorrect = false;
          if (q.question_type === 'multiple_choice') {
            const correctLetter = extractCorrectLetter(q.correct_answer);
            isCorrect = (userLetter === correctLetter) && hasAnswer;
          } else {
            const correctTf = String(q.correct_answer || '').toLowerCase().trim();
            const userTf = String(userAnswer || '').toLowerCase().trim();
            isCorrect = (userTf === correctTf) && hasAnswer;
          }
          const obtained = isCorrect ? q.marks : 0;
          if (isCorrect) { correctCount++; autoScore += obtained; }
          else if (hasAnswer) wrongCount++;
          return { ...answer, is_correct: isCorrect, obtained };
        }
        if (answer.obtained) autoScore += answer.obtained;
        return answer;
      });

      return {
        submission_id: sub.submission_id, sid: sub.sid,
        firstname: sub.firstname, lastname: sub.lastname, reg: sub.reg,
        submission_date: sub.submission_date, answers: processedAnswers,
        obtained_marks: sub.obtained_marks, auto_score: autoScore,
        correct_count: correctCount, wrong_count: wrongCount,
        unanswered_count: unansweredCount, feedback: sub.feedback || '',
        status: sub.status, file_path: sub.file_path || null,
      };
    });

    res.json({ assessment, questions, submissions: submissionsData });
  } catch (e) {
    console.error('Grade fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/submissions/:id/grade', async (req, res) => {
  const submissionId = parseInt(req.params.id, 10);
  if (!submissionId) return res.status(400).json({ error: 'Invalid submission ID' });
  const { marks = {}, feedback = '' } = req.body;
  const tid = req.user.tid;
  try {
    const [subs] = await pool.query(
      `SELECT sub.*, a.assessment_id, a.total_marks, a.passing_marks, a.title, a.tid
       FROM assessment_submissions sub
       INNER JOIN assessments a ON sub.assessment_id = a.assessment_id
       WHERE sub.submission_id = ?`,
      [submissionId]
    );
    if (subs.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const sub = subs[0];
    if (sub.tid !== tid) return res.status(403).json({ error: 'Not your assessment' });

    const [questions] = await pool.query(
      `SELECT question_id, marks FROM assessment_questions WHERE assessment_id = ?`,
      [sub.assessment_id]
    );
    const qMap = {};
    questions.forEach(q => { qMap[q.question_id] = q; });

    let answers = [];
    try { answers = sub.answers ? JSON.parse(sub.answers) : []; if (!Array.isArray(answers)) answers = []; } catch { answers = []; }

    let totalObtained = 0;
    answers = answers.map(answer => {
      const qid = answer.qid;
      const q = qMap[qid];
      if (!q) return answer;
      if (marks[qid] !== undefined && marks[qid] !== null && marks[qid] !== '') {
        const obtained = parseFloat(marks[qid]);
        const clamped = Math.max(0, Math.min(obtained, q.marks));
        totalObtained += clamped;
        return { ...answer, obtained: clamped, is_correct: clamped >= q.marks * 0.5 };
      }
      if (answer.obtained !== undefined && answer.obtained !== null) {
        totalObtained += Number(answer.obtained) || 0;
      }
      return answer;
    });

    await pool.query(
      `UPDATE assessment_submissions
       SET obtained_marks=?, answers=?, feedback=?, status='graded', graded_by=?, graded_date=NOW()
       WHERE submission_id = ?`,
      [totalObtained, JSON.stringify(answers), feedback || '', tid, submissionId]
    );

    const passed = totalObtained >= sub.passing_marks;
    try {
      await pool.query(
        `INSERT INTO notifications (sid, title, message, link, created_at)
         VALUES (?, 'Assessment Graded', ?, 'student_results.php', NOW())`,
        [sub.sid, `Your submission for "${sub.title}" has been graded. Score: ${totalObtained}/${sub.total_marks}`]
      );
    } catch (err) { console.warn('Notif error:', err.message); }

    res.json({ ok: true, obtained_marks: totalObtained, passed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MANAGE ASSESSMENTS ============
router.get('/manage-assessments', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.status, a.assessment_type, a.created_at,
              c.class_name, c.class_code,
              (SELECT COUNT(*) FROM assessment_submissions s WHERE s.assessment_id = a.assessment_id) as submission_count
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.tid = ?
       ORDER BY a.created_at DESC`,
      [tid]
    );
    res.json({ assessments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ REPORTS ============
router.get('/report-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code, c.level
       FROM class c
       LEFT JOIN assessments a ON a.cid = c.cid AND a.tid = ?
       LEFT JOIN permision p ON p.cid = c.cid AND p.tid = ?
       WHERE a.assessment_id IS NOT NULL OR p.gid IS NOT NULL
       ORDER BY c.class_name`,
      [tid, tid]
    );
    res.json({ classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/report-assessments/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [assessments] = await pool.query(
      `SELECT assessment_id, title, assessment_type, total_marks, passing_marks, status, created_at
       FROM assessments WHERE cid = ? AND tid = ?
       ORDER BY created_at DESC`,
      [cid, req.user.tid]
    );
    res.json({ assessments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/report-class-performance/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query(
      `SELECT a.assessment_id, a.title, a.assessment_type, a.total_marks, a.passing_marks,
              COUNT(DISTINCT sub.submission_id) as submissions,
              AVG(sub.obtained_marks) as avg_marks,
              MIN(sub.obtained_marks) as min_marks,
              MAX(sub.obtained_marks) as max_marks,
              SUM(CASE WHEN sub.obtained_marks >= a.passing_marks THEN 1 ELSE 0 END) as passed_count
       FROM assessments a
       LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id AND sub.status = 'graded'
       WHERE a.cid = ? AND a.tid = ?
       GROUP BY a.assessment_id ORDER BY a.created_at DESC`,
      [cid, req.user.tid]
    );
    const performance = rows.map(r => ({
      ...r,
      submissions: Number(r.submissions) || 0,
      avg_marks: r.avg_marks !== null ? Number(r.avg_marks) : 0,
      min_marks: r.min_marks !== null ? Number(r.min_marks) : 0,
      max_marks: r.max_marks !== null ? Number(r.max_marks) : 0,
      passed_count: Number(r.passed_count) || 0,
      passing_rate: r.submissions > 0 ? Number(((r.passed_count / r.submissions) * 100).toFixed(1)) : 0,
    }));
    res.json({ performance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/report-assessment/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg, sub.submission_id, sub.submission_date, sub.obtained_marks, sub.status, sub.feedback
       FROM student s
       LEFT JOIN assessment_submissions sub ON s.sid = sub.sid AND sub.assessment_id = ?
       WHERE s.class = ? ORDER BY s.firstname, s.lastname`,
      [assessmentId, assessment.cid]
    );

    let total_students = 0, submitted_count = 0, graded_count = 0, total_marks_sum = 0, max_marks = 0, min_marks = assessment.total_marks, pass_count = 0;
    const studentsResults = students.map(st => {
      total_students++;
      if (st.submission_id) {
        submitted_count++;
        if (st.status === 'graded') {
          graded_count++;
          const m = Number(st.obtained_marks) || 0;
          total_marks_sum += m;
          max_marks = Math.max(max_marks, m);
          min_marks = Math.min(min_marks, m);
          if (m >= assessment.passing_marks) pass_count++;
          const percentage = assessment.total_marks > 0 ? (m / assessment.total_marks) * 100 : 0;
          let grade = 'D';
          if (percentage >= 80) grade = 'A';
          else if (percentage >= 70) grade = 'B';
          else if (percentage >= 50) grade = 'C';
          return { ...st, percentage: Number(percentage.toFixed(1)), grade };
        }
      }
      return { ...st, percentage: null, grade: null };
    });

    const statistics = {
      total_students, submitted_count, graded_count,
      pending_grading: submitted_count - graded_count,
      not_submitted: total_students - submitted_count,
      average_marks: graded_count > 0 ? Number((total_marks_sum / graded_count).toFixed(2)) : 0,
      max_marks,
      min_marks: min_marks === assessment.total_marks && graded_count === 0 ? 0 : min_marks,
      passing_rate: graded_count > 0 ? Number(((pass_count / graded_count) * 100).toFixed(1)) : 0,
      pass_count,
    };

    const distribution = [0, 0, 0, 0, 0];
    studentsResults.forEach(s => {
      if (s.status === 'graded' && s.percentage !== null) {
        if (s.percentage <= 20) distribution[0]++;
        else if (s.percentage <= 40) distribution[1]++;
        else if (s.percentage <= 60) distribution[2]++;
        else if (s.percentage <= 80) distribution[3]++;
        else distribution[4]++;
      }
    });

    res.json({ assessment, statistics, students: studentsResults, distribution });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ DOWNLOAD RESPONSES ============
router.get('/download-assessments', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.assessment_type, a.created_at,
              c.class_name, c.class_code,
              (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.assessment_id) as total_questions,
              (SELECT COUNT(*) FROM assessment_submissions s WHERE s.assessment_id = a.assessment_id AND s.status IN ('submitted','graded')) as total_submissions
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.tid = ? ORDER BY a.created_at DESC`,
      [tid]
    );
    for (const a of assessments) {
      const [students] = await pool.query(
        `SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg
         FROM assessment_submissions sub
         INNER JOIN student s ON sub.sid = s.sid
         WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
         ORDER BY s.lastname, s.firstname`,
        [a.assessment_id]
      );
      a.students = students;
    }
    res.json({ assessments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excel export (SPECIFIC FIRST)
router.get('/download-answers/:assessmentId/excel', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text, correct_answer, marks
       FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );
    const [submissions] = await pool.query(
      `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid
       WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
       ORDER BY s.lastname, s.firstname`,
      [assessmentId]
    );
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;}th{background:#4CAF50;color:#fff;padding:8px;border:1px solid #ddd;}td{padding:6px;border:1px solid #ddd;}.correct{background:#d4edda;}.wrong{background:#f8d7da;}</style></head><body>`;

    for (const sub of submissions) {
      let answers = [];
      try { answers = sub.answers ? JSON.parse(sub.answers) : []; } catch { answers = []; }
      const answerMap = {};
      answers.forEach(a => { answerMap[a.qid] = a; });
      let total = 0;
      const rows = questions.map((q, idx) => {
        const a = answerMap[q.question_id] || {};
        const obtained = a.obtained ?? (a.is_correct ? q.marks : 0);
        total += Number(obtained) || 0;
        const studentAnswer = a.user_answer ?? a.answer ?? '';
        const rowClass = a.is_correct ? 'correct' : (studentAnswer ? 'wrong' : '');
        return `<tr class="${rowClass}"><td>${idx + 1}</td><td>${esc(q.question_text)}</td><td>${studentAnswer ? esc(studentAnswer) : '<em>No answer</em>'}</td><td>${esc(q.correct_answer)}</td><td>${obtained}</td><td>${q.marks}</td><td>${a.is_correct ? 'Correct' : (studentAnswer ? 'Wrong' : 'No Answer')}</td></tr>`;
      }).join('');
      const percentage = assessment.total_marks > 0 ? ((total / assessment.total_marks) * 100).toFixed(1) : '0.0';
      html += `<h2>${esc(assessment.title)}</h2><h3>${esc(sub.firstname + ' ' + sub.lastname)} (${esc(sub.reg)})</h3><table style="width:100%"><tr><th>#</th><th>Question</th><th>Answer</th><th>Correct</th><th>Obtained</th><th>Max</th><th>Status</th></tr>${rows}<tr style="background:#f0f0f0;font-weight:bold;"><td colspan="4" style="text-align:right;">TOTAL:</td><td>${total}</td><td>${assessment.total_marks}</td><td>${percentage}%</td></tr></table><br>`;
      if (sub.feedback) html += `<div><b>Feedback:</b><br>${esc(sub.feedback)}</div>`;
      html += '<hr style="margin:40px 0">';
    }
    html += '</body></html>';
    const safeTitle = assessment.title.replace(/[^A-Za-z0-9\-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_answers.xls"`);
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Paper export (SPECIFIC BEFORE GENERIC)
router.get('/download-answers/:assessmentId/paper', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
  if (!assessmentId) return res.status(400).send('Invalid assessment ID');
  const tid = req.user.tid;
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).send('Assessment not found');
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );

    let sql = `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
               FROM assessment_submissions sub INNER JOIN student s ON sub.sid = s.sid
               WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')`;
    const params = [assessmentId];
    if (studentId) { sql += ' AND sub.sid = ?'; params.push(studentId); }
    sql += ' ORDER BY s.lastname, s.firstname';
    const [submissions] = await pool.query(sql, params);

    const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const nl2br = v => esc(v).replace(/\n/g, '<br>');
    let pages = '';

    for (const sub of submissions) {
      let answers = [];
      try { answers = sub.answers ? JSON.parse(sub.answers) : []; } catch {}
      const answerMap = {};
      answers.forEach(a => { answerMap[a.qid] = a; });
      let totalScore = 0, qNum = 1, questionsHtml = '';

      for (const q of questions) {
        const a = answerMap[q.question_id] || {};
        const studentAnswer = a.user_answer ?? a.answer ?? '';
        const obtained = a.obtained ?? (a.is_correct ? q.marks : 0);
        totalScore += Number(obtained) || 0;
        const hasAnswer = studentAnswer !== '' && studentAnswer !== null;
        const isCorrect = !!a.is_correct;
        const isMC = q.question_type === 'multiple_choice' || q.question_type === 'multiple_choice_single' || q.question_type === 'multiple_choice_multiple';

        let optionsHtml = '';
        if (isMC) {
          optionsHtml = '<div class="options">';
          if (q.option_a) optionsHtml += `A. ${esc(q.option_a)}<br>`;
          if (q.option_b) optionsHtml += `B. ${esc(q.option_b)}<br>`;
          if (q.option_c) optionsHtml += `C. ${esc(q.option_c)}<br>`;
          if (q.option_d) optionsHtml += `D. ${esc(q.option_d)}<br>`;
          optionsHtml += '</div>';
        }

        let correctHtml = '';
        if (isMC || q.question_type === 'true_false') {
          correctHtml = `Correct: <strong>${esc(q.correct_answer)}</strong>`;
        } else {
          correctHtml = nl2br(q.correct_answer || '');
        }

        questionsHtml += `<div class="question-block"><div class="question-text"><strong>Q${qNum}</strong> (${q.marks} marks)<br>${nl2br(q.question_text)}${optionsHtml}</div><div class="student-answer"><strong>STUDENT:</strong><br>${hasAnswer ? `${nl2br(studentAnswer)}<div class="answer-status"><span class="${isCorrect ? 'tick' : 'cross'}">${isCorrect ? 'CORRECT' : 'WRONG'}</span></div>` : `<em>No answer</em>`}</div><div class="correct-answer"><strong>CORRECT:</strong><br>${correctHtml}</div><div class="marks-box"><strong>Marks:</strong> ${obtained} / ${q.marks}</div></div>`;
        qNum++;
      }

      const percentage = assessment.total_marks > 0 ? (totalScore / assessment.total_marks) * 100 : 0;
      const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
      pages += `<div class="page"><div class="header"><div class="school-name">FUTURE KING SCHOOLS</div><div class="assessment-title">${esc(assessment.title).toUpperCase()}</div><div>Student Answer Sheet</div></div><div class="student-info"><h4>STUDENT</h4><table><tr><td><strong>Name:</strong></td><td>${esc(sub.firstname + ' ' + sub.lastname)}</td><td><strong>Reg:</strong></td><td>${esc(sub.reg)}</td></tr><tr><td><strong>Class:</strong></td><td>${esc(sub.class)}</td><td><strong>Submitted:</strong></td><td>${new Date(sub.submission_date).toLocaleString()}</td></tr></table></div><h3>QUESTIONS AND ANSWERS</h3>${questionsHtml}<div class="score-summary"><table style="width:100%;text-align:center;"><tr><td><strong>Score:</strong><br>${totalScore} / ${assessment.total_marks}</td><td><strong>Percentage:</strong><br>${percentage.toFixed(1)}%</td><td><strong>Grade:</strong><br>${grade}</td></tr><tr><td colspan="3"><strong>Status:</strong> ${totalScore >= assessment.passing_marks ? 'PASSED' : 'FAILED'}</td></tr></table></div>${sub.feedback ? `<div style="margin-top:20px;padding:15px;background:#fff3cd;border-left:4px solid #ffc107;"><strong>FEEDBACK:</strong><br>${nl2br(sub.feedback)}</div>` : ''}<div class="footer"><div>Generated: ${new Date().toLocaleString()}</div></div></div>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(assessment.title)}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:"Times New Roman",serif;background:white;padding:20px;}.page{max-width:900px;margin:0 auto;page-break-after:always;}.header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #000;}.school-name{font-size:24px;font-weight:bold;}.assessment-title{font-size:20px;font-weight:bold;margin:15px 0 5px;}.student-info{margin:20px 0;padding:15px;border:1px solid #ccc;background:#f9f9f9;}.student-info table{width:100%;}.student-info td{padding:8px;}.question-block{margin-bottom:25px;page-break-inside:avoid;}.question-text{font-weight:bold;margin-bottom:10px;padding:10px;background:#e8f4fd;border-left:4px solid #4CAF50;}.student-answer{margin:10px 0;padding:12px;background:#f8f9fa;border-left:3px solid #1a73e8;}.correct-answer{margin:10px 0;padding:12px;background:#e6f4ea;border-left:3px solid #34a853;}.marks-box{margin-top:10px;text-align:right;}.score-summary{margin-top:30px;padding:15px;border:2px solid #000;text-align:center;background:#f0f0f0;}.tick{color:green;font-weight:bold;}.cross{color:red;font-weight:bold;}.no-print{text-align:center;padding:15px;background:#e8f4fd;margin-bottom:20px;}@media print{.no-print{display:none;}}</style></head><body><div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>${pages}<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400);});</script></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

// Generic download-answers (LAST)
router.get('/download-answers/:assessmentId', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = req.user.tid;
  const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );

    let sql = `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
               FROM assessment_submissions sub INNER JOIN student s ON sub.sid = s.sid
               WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')`;
    const params = [assessmentId];
    if (studentId) { sql += ' AND sub.sid = ?'; params.push(studentId); }
    sql += ' ORDER BY s.lastname, s.firstname';
    const [submissions] = await pool.query(sql, params);

    const processed = submissions.map(sub => {
      let answers = [];
      try { answers = sub.answers ? JSON.parse(sub.answers) : []; } catch { answers = []; }
      const answerMap = {};
      answers.forEach(a => { answerMap[a.qid] = a; });
      let totalScore = 0;
      const detailed = questions.map(q => {
        const a = answerMap[q.question_id] || {};
        const obtained = a.obtained !== undefined && a.obtained !== null ? Number(a.obtained) : (a.is_correct ? q.marks : 0);
        totalScore += obtained;
        return { question_id: q.question_id, question_text: q.question_text, student_answer: a.user_answer ?? a.answer ?? '', is_correct: !!a.is_correct, obtained, marks: q.marks, correct_answer: q.correct_answer };
      });
      const percentage = assessment.total_marks > 0 ? (totalScore / assessment.total_marks) * 100 : 0;
      let grade = 'F';
      if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      return { submission_id: sub.submission_id, sid: sub.sid, firstname: sub.firstname, lastname: sub.lastname, reg: sub.reg, total_score: totalScore, percentage: Number(percentage.toFixed(1)), grade, questions: detailed };
    });
    res.json({ assessment, submissions: processed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ UPDATE ACTIVITY ============
router.post('/update-activity', async (req, res) => {
  try {
    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [req.user.tcode]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ============ MODULE PICKER ============
router.get('/teacher-modules/:cid', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const [modules] = await pool.query(
      `SELECT m.moid, m.mname, m.mcode, m.module_type, m.credit
       FROM module m
       INNER JOIN permision p ON p.mid = m.moid
       WHERE m.class = ? AND p.tid = ?
       ORDER BY m.mname`,
      [cid, tid]
    );
    res.json({ modules });
  } catch (e) {
    console.error('Teacher modules error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ MARKS OVERVIEW + UPLOAD PANEL ============

// Get marks matrix + metadata for a class/module
router.get('/teacher-marks/:cid/:mid', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.params.cid, 10);
  const mid = parseInt(req.params.mid, 10);
  if (!cid || !mid) return res.status(400).json({ error: 'Invalid cid or mid' });

  try {
    // Class + module label
    const [infoRows] = await pool.query(
      `SELECT c.level, c.class_name, m.mname, m.credit
       FROM class c, module m
       WHERE c.cid = ? AND m.moid = ?`,
      [cid, mid]
    );
    const info = infoRows[0] || {};

    // Active year
    const [yearRows] = await pool.query(
      "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1"
    );
    const activeYear = yearRows[0] || null;

    // Students in this class for the active year
    let students = [];
    if (activeYear) {
      const [stu] = await pool.query(
        `SELECT DISTINCT s.sid, s.firstname, s.lastname
         FROM student s
         INNER JOIN student_promotion_log spl ON spl.sid = s.sid
         WHERE s.status = 'Active'
           AND spl.to_year = ?
           AND spl.to_class = ?
         ORDER BY s.firstname, s.lastname`,
        [activeYear.year_id, cid]
      );
      students = stu;
    }

    // Existing marks keyed by [sid][term]
    const marksByStudent = {};
    if (activeYear && students.length > 0) {
      const [marks] = await pool.query(
        `SELECT sid, team, test, ttotal, exam, etotal
         FROM marks
         WHERE year = ? AND cid = ? AND mid = ? AND tid = ?`,
        [activeYear.year_id, cid, mid, tid]
      );
      marks.forEach(m => {
        if (!marksByStudent[m.sid]) marksByStudent[m.sid] = {};
        marksByStudent[m.sid][m.team] = {
          test: m.test, ttotal: m.ttotal,
          exam: m.exam, etotal: m.etotal,
        };
      });
    }

    const autoTotal = (info.credit || 0) * 10;

    // Years list for dropdown
    const [years] = await pool.query(
      'SELECT year_id, year, status FROM year ORDER BY year DESC'
    );

    // Assessments list for dropdown
    const [assessments] = await pool.query(
      'SELECT AssNo as id, AssName as name FROM assessment ORDER BY AssNo ASC'
    );

    res.json({
      info,
      activeYear,
      students: students.map(s => ({
        ...s,
        marks: marksByStudent[s.sid] || {},
      })),
      autoTotal,
      years,
      assessments,
    });
  } catch (e) {
    console.error('Teacher marks error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Save "next step" selection (year, term, type, total) — the PHP stored these
// in $_SESSION and navigated to upload.php. In React we'll keep them in the URL,
// but we can also persist them here if you want.
router.post('/teacher-marks/selection', async (req, res) => {
  const { year, tearm, type, total } = req.body;
  if (!year || !tearm || !type || total === undefined) {
    return res.status(400).json({ error: 'year, tearm, type, total required' });
  }
  // Nothing persisted server-side; React keeps them in state / URL.
  res.json({ ok: true });
});
// ============ UPLOAD MARKS (AUTO-SAVE) ============

// Validate the request context (class, module, year, term, type) — used by the page
router.get('/teacher-upload-marks/context', async (req, res) => {
  const tid = req.user.tid;
  const { cid, mid, year, term, type } = req.query;

  if (!cid || !mid || !year || !term || !type) {
    return res.status(400).json({ error: 'cid, mid, year, term, type required' });
  }

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const typeInt = parseInt(type, 10);

  try {
    // Verify teacher has permission for this class + module
    const [perm] = await pool.query(
      `SELECT * FROM permision WHERE tid = ? AND cid = ? AND mid = ?`,
      [tid, cidInt, midInt]
    );
    if (perm.length === 0) {
      return res.status(403).json({ error: 'You do not have permission for this class/module' });
    }

    // Module info
    const [modRows] = await pool.query(
      `SELECT m.mname, m.credit, c.level, c.class_name
       FROM module m INNER JOIN class c ON c.cid = ?
       WHERE m.moid = ?`,
      [cidInt, midInt]
    );
    const module = modRows[0] || {};

    // Total marks (credit × 10) — matches PHP
    const total = (module.credit || 0) * 10;

    // Check gating conditions (same as PHP)
    const studentFilter = `sid IN (SELECT sid FROM student WHERE class = ? AND status = 'Active')`;

    let mode = 'normal';  // 'normal' | 'already_exists' | 'need_test_first'
    let message = '';

    if (typeInt === 2) {
      // Exam: test marks must exist first
      const [testRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks
         WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND test IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]
      );
      if (testRows[0].cnt === 0) {
        return res.json({
          success: true,
          mode: 'need_test_first',
          message: 'Test marks must be entered first before exams.',
          module,
          total,
          students: [],
        });
      }

      const [examRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks
         WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND exam IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]
      );
      if (examRows[0].cnt > 0) {
        return res.json({
          success: true,
          mode: 'already_exists',
          message: 'Exam marks for this assessment already exist.',
          module,
          total,
          students: [],
        });
      }
    }

    if (typeInt === 1) {
      const [testRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks
         WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND test IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]
      );
      if (testRows[0].cnt > 0) {
        return res.json({
          success: true,
          mode: 'already_exists',
          message: 'Test marks for this assessment already exist.',
          module,
          total,
          students: [],
        });
      }
    }

    // Get students — same query as PHP
    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg
       FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active'
       ORDER BY s.firstname ASC`,
      [cidInt, yearInt]
    );

    // Fallback: if promotion log returns nothing, try direct class assignment
    let finalStudents = students;
    if (finalStudents.length === 0) {
      const [alt] = await pool.query(
        `SELECT sid, firstname, lastname, reg
         FROM student
         WHERE class = ? AND status = 'Active'
         ORDER BY firstname ASC`,
        [cidInt]
      );
      finalStudents = alt;
    }

    // Get existing marks for this context
    const [existingMarks] = await pool.query(
      `SELECT sid, test, exam, ttotal, etotal FROM marks
       WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [midInt, tid, cidInt, termInt, yearInt]
    );
    const markMap = {};
    existingMarks.forEach(m => {
      markMap[m.sid] = typeInt === 1 ? m.test : m.exam;
    });

    res.json({
      success: true,
      mode: 'normal',
      module,
      total,
      students: finalStudents.map(s => ({
        ...s,
        existingMark: markMap[s.sid] ?? '',
      })),
    });
  } catch (e) {
    console.error('Upload marks context error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Auto-save a single mark (the PHP's POST handler)
router.post('/teacher-upload-marks/save', async (req, res) => {
  const tid = req.user.tid;
  const { cid, mid, year, term, type, student_id, mark_data } = req.body;

  if (!cid || !mid || !year || !term || !type || !student_id) {
    return res.json({ success: false, message: 'Missing required fields' });
  }
  if (mark_data === undefined || mark_data === null || mark_data === '') {
    return res.json({ success: false, message: 'No mark data received' });
  }

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const typeInt = parseInt(type, 10);
  const sid = parseInt(student_id, 10);
  const mark = parseFloat(mark_data);

  if (isNaN(mark)) {
    return res.json({ success: false, message: 'Invalid mark value' });
  }

  try {
    // Recompute total (credit × 10) — never trust client
    const [modRows] = await pool.query('SELECT credit FROM module WHERE moid = ?', [midInt]);
    const total = (modRows[0]?.credit || 0) * 10;

    if (mark < 0 || mark > total) {
      return res.json({ success: false, message: `Mark must be between 0 and ${total}` });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Check if row already exists
    const [existing] = await pool.query(
      `SELECT mark_id FROM marks
       WHERE sid = ? AND mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [sid, midInt, tid, cidInt, termInt, yearInt]
    );

    if (typeInt === 1) {
      // TEST
      if (existing.length > 0) {
        await pool.query(
          `UPDATE marks SET test = ?, ttotal = ?, date = ? WHERE mark_id = ?`,
          [mark, total, today, existing[0].mark_id]
        );
      } else {
        await pool.query(
          `INSERT INTO marks (cid, sid, test, ttotal, mid, year, tid, team, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cidInt, sid, mark, total, midInt, yearInt, tid, termInt, today]
        );
      }
      return res.json({ success: true, message: 'Test mark saved successfully!' });
    } else if (typeInt === 2) {
      // EXAM
      if (existing.length > 0) {
        await pool.query(
          `UPDATE marks SET exam = ?, etotal = ?, date = ? WHERE mark_id = ?`,
          [mark, total, today, existing[0].mark_id]
        );
      } else {
        await pool.query(
          `INSERT INTO marks (cid, sid, exam, etotal, mid, year, tid, team, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cidInt, sid, mark, total, midInt, yearInt, tid, termInt, today]
        );
      }
      return res.json({ success: true, message: 'Exam mark saved successfully!' });
    }

    res.json({ success: false, message: 'Invalid assessment type' });
  } catch (e) {
    console.error('Save mark error:', e);
    res.json({ success: false, message: 'Error: ' + e.message });
  }
});
// ============ YEARS LIST ============
router.get('/years-list', async (_req, res) => {
  try {
    const [years] = await pool.query(
      'SELECT year_id, year, status FROM year ORDER BY year DESC'
    );
    res.json({ years });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MYMODULE — CHOOSE CLASS ============
router.get('/mymodule-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code
       FROM class c
       INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ?
       ORDER BY c.level, c.class_name`,
      [tid]
    );
    res.json({ classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MYMODULES — CHOOSE MODULE ============
router.get('/mymodules/:cid', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const [modules] = await pool.query(
      `SELECT m.moid, m.mname, m.mcode, m.module_type, m.credit
       FROM module m
       INNER JOIN permision p ON p.mid = m.moid
       WHERE m.class = ? AND p.tid = ?
       ORDER BY m.mname`,
      [cid, tid]
    );
    res.json({ modules });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ============ MYMODULE FLOW: YEAR + TERM ============

// Years that have marks entered by this teacher (matches module_year.php)
router.get('/mymodule-years', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT
         m.year AS marks_year_id,
         y.year_id,
         y.year AS academic_year,
         y.status
       FROM marks m
       INNER JOIN year y ON m.year = y.year_id
       WHERE m.tid = ?
       ORDER BY y.year DESC`,
      [tid]
    );
    res.json({ years: rows });
  } catch (e) {
    console.error('Mymodule years error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Terms that have marks for this teacher in this year (matches module_term.php)
router.get('/mymodule-terms/:yearId', async (req, res) => {
  const tid = req.user.tid;
  const yearId = parseInt(req.params.yearId, 10);
  if (!yearId) return res.status(400).json({ error: 'Invalid year ID' });

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT team
       FROM marks
       WHERE year = ? AND tid = ?
       ORDER BY team`,
      [yearId, tid]
    );
    res.json({ terms: rows.map(r => r.team) });
  } catch (e) {
    console.error('Mymodule terms error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ LIST MARKS (read-only) — list.php ============
router.get('/list-marks', async (req, res) => {
  const tid = req.user.tid;
  const { cid, mid, year, term } = req.query;

  if (!cid || !mid || !year || !term) {
    return res.status(400).json({ error: 'cid, mid, year, term required' });
  }

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);

  try {
    // Year label
    const [yearRows] = await pool.query('SELECT year FROM year WHERE year_id = ?', [yearInt]);
    const academicYearName = yearRows[0]?.year || 'Unknown Year';

    // Class + module info
    const [infoRows] = await pool.query(
      `SELECT c.level, c.class_name, m.mname
       FROM class c, module m
       WHERE m.moid = ? AND c.cid = ?`,
      [midInt, cidInt]
    );
    const info = infoRows[0] || {};

    // Students + left-joined marks
    const [rows] = await pool.query(
      `SELECT 
         s.sid, s.firstname, s.lastname,
         m.test, m.ttotal, m.exam, m.etotal
       FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       LEFT JOIN marks m ON m.sid = s.sid
         AND m.team = ? AND m.year = ? AND m.cid = ?
         AND m.tid = ? AND m.mid = ?
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active'
       ORDER BY s.firstname ASC`,
      [termInt, yearInt, cidInt, tid, midInt, cidInt, yearInt]
    );

    // Count of students who have any mark
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as cnt FROM marks
       WHERE cid = ? AND tid = ? AND mid = ? AND team = ? AND year = ?`,
      [cidInt, tid, midInt, termInt, yearInt]
    );

    res.json({
      academicYearName,
      info,
      students: rows,
      markedCount: countRows[0].cnt || 0,
    });
  } catch (e) {
    console.error('List marks error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ EDIT MARKS — edit.php ============
// Fetch for edit page
router.get('/edit-marks', async (req, res) => {
  const tid = req.user.tid;
  const { cid, mid, year, term } = req.query;

  if (!cid || !mid || !year || !term) {
    return res.status(400).json({ error: 'cid, mid, year, term required' });
  }

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);

  try {
    const [infoRows] = await pool.query(
      `SELECT c.level, c.class_name, m.mname, m.credit
       FROM class c, module m
       WHERE m.moid = ? AND c.cid = ?`,
      [midInt, cidInt]
    );
    const info = infoRows[0] || {};
    const defaultTotal = (info.credit || 0) * 10;

    const [students] = await pool.query(
      `SELECT 
         s.sid, s.firstname, s.lastname,
         m.mark_id, m.test, m.ttotal, m.exam, m.etotal
       FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       LEFT JOIN marks m ON m.sid = s.sid
         AND m.team = ? AND m.year = ? AND m.cid = ?
         AND m.tid = ? AND m.mid = ?
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active'
       ORDER BY s.firstname ASC`,
      [termInt, yearInt, cidInt, tid, midInt, cidInt, yearInt]
    );

    res.json({ info, defaultTotal, students });
  } catch (e) {
    console.error('Edit marks fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Save one student's marks (matches save_markedit.php)
router.post('/save-markedit', async (req, res) => {
  const tid = req.user.tid;
  const {
    sid, mark_id,
    test, ttotal, exam, etotal,
    ototal, mtotal,
    module: midRaw, class: cidRaw, term, year,
  } = req.body;

  if (!sid || !midRaw || !cidRaw || !term || !year) {
    return res.json({ success: false, error: 'Missing required fields' });
  }

  const cidInt = parseInt(cidRaw, 10);
  const midInt = parseInt(midRaw, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const sidInt = parseInt(sid, 10);

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Normalize numbers
    const nTest = test === '' || test === null ? null : Number(test);
    const nTTotal = ttotal === '' || ttotal === null ? null : Number(ttotal);
    const nExam = exam === '' || exam === null ? null : Number(exam);
    const nETotal = etotal === '' || etotal === null ? null : Number(etotal);
    const nOTotal = ototal === '' || ototal === null ? null : Number(ototal);
    const nMTotal = mtotal === '' || mtotal === null ? null : Number(mtotal);

    // Check if row exists
    const [existing] = await pool.query(
      `SELECT mark_id FROM marks
       WHERE sid = ? AND mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [sidInt, midInt, tid, cidInt, termInt, yearInt]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE marks SET test = ?, ttotal = ?, exam = ?, etotal = ?,
                          ototal = ?, mtotal = ?, date = ?
         WHERE mark_id = ?`,
        [nTest, nTTotal, nExam, nETotal, nOTotal, nMTotal, today, existing[0].mark_id]
      );
      return res.json({
        success: true,
        mark_id: existing[0].mark_id,
        message: 'Marks updated successfully',
      });
    } else {
      const [r] = await pool.query(
        `INSERT INTO marks
         (sid, mid, tid, cid, team, year, test, ttotal, exam, etotal, ototal, mtotal, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sidInt, midInt, tid, cidInt, termInt, yearInt,
         nTest, nTTotal, nExam, nETotal, nOTotal, nMTotal, today]
      );
      return res.json({
        success: true,
        mark_id: r.insertId,
        message: 'Marks saved successfully',
      });
    }
  } catch (e) {
    console.error('Save markedit error:', e);
    res.json({ success: false, error: e.message });
  }
});
// ============ VIEW RESULTS (view_results.php) ============
router.get('/view-results', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.created_at,
              c.class_name,
              COUNT(DISTINCT sub.submission_id) as total_submissions,
              AVG(sub.obtained_marks) as average_marks,
              MIN(sub.obtained_marks) as min_marks,
              MAX(sub.obtained_marks) as max_marks
       FROM assessments a
       JOIN class c ON a.cid = c.cid
       LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE a.tid = ? AND a.status = 'completed'
       GROUP BY a.assessment_id
       ORDER BY a.created_at DESC`,
      [tid]
    );
    res.json({ results: rows });
  } catch (e) {
    console.error('View results error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ DISCUSSION FORUMS (discussion_forum.php) ============

// List forums created by this teacher
router.get('/forums', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT f.forum_id, f.cid, f.title, f.description, f.created_at, f.status,
              c.class_name,
              (SELECT COUNT(*) FROM forum_topics WHERE forum_id = f.forum_id) as topic_count
       FROM discussion_forums f
       JOIN class c ON f.cid = c.cid
       WHERE f.created_by = ?
       ORDER BY f.created_at DESC`,
      [tid]
    );
    res.json({ forums: rows });
  } catch (e) {
    console.error('Forums list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Teacher's permitted classes for the forum form
router.get('/forum-classes', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name
       FROM class c
       INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ?
       ORDER BY c.class_name`,
      [tid]
    );
    res.json({ classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a forum
router.post('/forums', async (req, res) => {
  const tid = req.user.tid;
  const { cid, title, description } = req.body;
  if (!cid || !title) return res.status(400).json({ error: 'cid and title required' });

  try {
    const [r] = await pool.query(
      `INSERT INTO discussion_forums (cid, title, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [cid, title.trim(), description?.trim() || null, tid]
    );
    res.json({ ok: true, forum_id: r.insertId });
  } catch (e) {
    console.error('Create forum error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ MARK ATTENDANCE (mark_attendance.php) ============

// Load students + their existing attendance for a class and date
router.get('/attendance-students', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.query.cid, 10);
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });

  try {
    // Verify teacher has this class
    const [perm] = await pool.query(
      'SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1',
      [tid, cid]
    );
    if (perm.length === 0) return res.status(403).json({ error: 'No permission for this class' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg
       FROM student s
       WHERE s.class = ?
       ORDER BY s.firstname`,
      [className]
    );

    const [existing] = await pool.query(
      `SELECT sid, status FROM attendance WHERE cid = ? AND class_date = ?`,
      [cid, date]
    );
    const map = {};
    existing.forEach(a => { map[a.sid] = a.status; });

    res.json({
      className,
      date,
      students: students.map(s => ({
        ...s,
        attendance_status: map[s.sid] || '',
      })),
    });
  } catch (e) {
    console.error('Attendance students error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Save attendance (bulk upsert)
router.post('/attendance', async (req, res) => {
  const tid = req.user.tid;
  const { cid, date, attendance } = req.body;

  if (!cid || !date || !attendance || typeof attendance !== 'object') {
    return res.status(400).json({ error: 'cid, date, attendance required' });
  }

  try {
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    for (const [sid, status] of Object.entries(attendance)) {
      if (!validStatuses.includes(status)) continue;

      const [existing] = await pool.query(
        'SELECT attendance_id FROM attendance WHERE sid = ? AND cid = ? AND class_date = ?',
        [sid, cid, date]
      );

      if (existing.length > 0) {
        await pool.query(
          'UPDATE attendance SET status = ?, marked_by = ? WHERE attendance_id = ?',
          [status, tid, existing[0].attendance_id]
        );
      } else {
        await pool.query(
          `INSERT INTO attendance (cid, sid, class_date, status, marked_by)
           VALUES (?, ?, ?, ?, ?)`,
          [cid, sid, date, status, tid]
        );
      }
    }
    res.json({ ok: true, message: 'Attendance saved successfully' });
  } catch (e) {
    console.error('Save attendance error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ ATTENDANCE REPORT (attendance_report.php) ============
router.get('/attendance-report', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.query.cid, 10);
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  if (!cid) return res.status(400).json({ error: 'cid required' });

  try {
    const [perm] = await pool.query(
      'SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1',
      [tid, cid]
    );
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [rows] = await pool.query(
      `SELECT 
         s.sid, s.firstname, s.lastname, s.reg,
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
         SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
         SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
         COUNT(a.attendance_id) as total_days
       FROM student s
       LEFT JOIN attendance a ON s.sid = a.sid
         AND a.cid = ?
         AND DATE_FORMAT(a.class_date, '%Y-%m') = ?
       WHERE s.class = ?
       GROUP BY s.sid
       ORDER BY s.firstname`,
      [cid, month, className]
    );

    res.json({
      className,
      month,
      rows: rows.map(r => ({
        ...r,
        percentage: r.total_days > 0
          ? Number(((r.present_days / r.total_days) * 100).toFixed(1))
          : 0,
      })),
    });
  } catch (e) {
    console.error('Attendance report error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ UPLOAD MATERIALS (upload_materials.php) ============

const materialsUpload = multer({
  dest: 'uploads/materials/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// List materials uploaded by this teacher
router.get('/materials', async (req, res) => {
  const tid = req.user.tid;
  try {
    const [rows] = await pool.query(
      `SELECT m.material_id, m.cid, m.title, m.description, m.material_type,
              m.file_path, m.file_name, m.file_size, m.uploaded_at,
              c.class_name
       FROM study_materials m
       JOIN class c ON m.cid = c.cid
       WHERE m.tid = ?
       ORDER BY m.uploaded_at DESC`,
      [tid]
    );
    res.json({ materials: rows });
  } catch (e) {
    console.error('Materials list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Upload material
router.post('/materials', materialsUpload.single('file'), async (req, res) => {
  const tid = req.user.tid;
  const { cid, title, description, material_type } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!cid || !title || !material_type) {
    if (file.path) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'cid, title, material_type required' });
  }

  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
                   'jpg', 'jpeg', 'png', 'mp4', 'zip'];
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!allowed.includes(ext)) {
    fs.unlinkSync(file.path);
    return res.status(400).json({
      error: `File type .${ext} not allowed. Allowed: ${allowed.join(', ')}`,
    });
  }

  try {
    const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const finalPath = path.join('uploads/materials', safeName);
    fs.renameSync(file.path, finalPath);

    const [r] = await pool.query(
      `INSERT INTO study_materials
       (cid, tid, title, description, material_type, file_path, file_name, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cid, tid, title.trim(), description?.trim() || null,
       material_type, finalPath.replace(/\\/g, '/'), safeName, file.size]
    );
    res.json({ ok: true, material_id: r.insertId });
  } catch (e) {
    console.error('Upload material error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete a material
router.delete('/materials/:id', async (req, res) => {
  const tid = req.user.tid;
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid material ID' });

  try {
    const [rows] = await pool.query(
      'SELECT file_path FROM study_materials WHERE material_id = ? AND tid = ?',
      [id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const fp = rows[0].file_path;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);

    await pool.query('DELETE FROM study_materials WHERE material_id = ? AND tid = ?', [id, tid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ============ CLASS REPORTS (class_reports.php) ============
router.get('/class-reports', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.query.cid, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });

  try {
    const [perm] = await pool.query(
      'SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1',
      [tid, cid]
    );
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [[{ total: studentCount }]] = await pool.query(
      'SELECT COUNT(*) as total FROM student WHERE class = ?',
      [className]
    );

    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.assessment_type, a.total_marks,
              AVG(sub.obtained_marks) as avg_marks,
              COUNT(DISTINCT sub.submission_id) as submissions
       FROM assessments a
       LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE a.cid = ?
       GROUP BY a.assessment_id`,
      [cid]
    );

    const [[attendanceStats]] = await pool.query(
      `SELECT 
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as late,
         COUNT(*) as total
       FROM attendance WHERE cid = ?`,
      [cid]
    );

    const attendanceRate = attendanceStats.total > 0
      ? Number(((attendanceStats.present / attendanceStats.total) * 100).toFixed(1))
      : 0;

    res.json({
      className,
      studentCount,
      assessmentCount: assessments.length,
      attendanceRate,
      assessments,
    });
  } catch (e) {
    console.error('Class reports error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ STUDENT PERFORMANCE (student_performance.php) ============
router.get('/student-performance', async (req, res) => {
  const tid = req.user.tid;
  const cid = parseInt(req.query.cid, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });

  try {
    const [perm] = await pool.query(
      'SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1',
      [tid, cid]
    );
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [rows] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg,
         (SELECT AVG(sub.obtained_marks)
          FROM assessment_submissions sub
          JOIN assessments a ON sub.assessment_id = a.assessment_id
          WHERE sub.sid = s.sid AND a.cid = ?) as avg_marks,
         (SELECT COUNT(*)
          FROM assessment_submissions sub
          JOIN assessments a ON sub.assessment_id = a.assessment_id
          WHERE sub.sid = s.sid AND a.cid = ?) as total_assessments,
         (SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)
          FROM attendance WHERE sid = s.sid AND cid = ?) as present_days,
         (SELECT COUNT(*) FROM attendance
          WHERE sid = s.sid AND cid = ?) as total_days
       FROM student s
       WHERE s.class = ?
       ORDER BY s.firstname`,
      [cid, cid, cid, cid, className]
    );

    const students = rows.map(r => {
      const avg = Number(r.avg_marks || 0);
      let grade = 'D';
      if (avg >= 80) grade = 'A';
      else if (avg >= 70) grade = 'B';
      else if (avg >= 50) grade = 'C';
      const attPercent = r.total_days > 0
        ? Number(((r.present_days / r.total_days) * 100).toFixed(1))
        : 0;
      return { ...r, avg: Number(avg.toFixed(2)), grade, attendance_percent: attPercent };
    });

    res.json({ className, students });
  } catch (e) {
    console.error('Student performance error:', e);
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;