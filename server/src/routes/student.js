// server/src/routes/student.js
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth(['student']));

const APPROVAL_TOKEN_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TZ = 'Africa/Kigali';

function getIO(req) {
  try { return req.app.get('io') || null; } catch { return null; }
}

// ============================================================
// DATE UTILITIES (IANA-timezone aware)
// ============================================================
function toDateStr(v) {
  if (!v) return null;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  const d = new Date(v);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeStr(v) {
  if (!v) return '00:00:00';
  if (typeof v === 'string') {
    const m = v.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (!m) return '00:00:00';
    return m[1].length === 5 ? `${m[1]}:00` : m[1];
  }
  const d = new Date(v);
  if (isNaN(d)) return '00:00:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function parseDtInZone(dateVal, timeVal, ianaTz = DEFAULT_TZ) {
  const d = toDateStr(dateVal);
  const t = toTimeStr(timeVal);
  if (!d || !t) return null;
  try {
    const naive = new Date(`${d}T${t}`);
    const asZoneStr = naive.toLocaleString('en-US', { timeZone: ianaTz });
    const asZone = new Date(asZoneStr);
    const diff = naive.getTime() - asZone.getTime();
    return new Date(naive.getTime() + diff);
  } catch {
    return null;
  }
}

function fmtInTz(dateObj, ianaTz = DEFAULT_TZ) {
  if (!dateObj) return '';
  return dateObj.toLocaleString('en-GB', { timeZone: ianaTz });
}

function normalizeAssessment(a) {
  if (!a) return a;
  return {
    ...a,
    start_date: toDateStr(a.start_date),
    end_date: toDateStr(a.end_date),
    start_time: toTimeStr(a.start_time),
    end_time: toTimeStr(a.end_time),
  };
}

function newApprovalToken() {
  return crypto.randomBytes(32).toString('hex');
}

function clientTz(req) {
  const tz = req.headers['x-client-timezone'];
  return (typeof tz === 'string' && tz.length < 64) ? tz : DEFAULT_TZ;
}

// ============================================================
// RATE LIMITERS
// ============================================================
const startRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: (req) => `${req.user?.sid}:${req.params.id}`,
  message: { error: 'Too many requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.user?.sid}:${req.params.id}`,
  message: { error: 'Too many submissions. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// PROFILE / ME
// ============================================================
router.get('/me', async (req, res) => {
  const sid = req.user.sid;
  const classId = req.user.classId;
  try {
    const [studentRows] = await pool.query(
      `SELECT s.*, c.class_name, c.class_code FROM student s
       INNER JOIN class c ON s.class = c.cid WHERE s.sid = ? LIMIT 1`, [sid]);
    const student = studentRows[0] || {};
    const [[totalAssessments]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE c.cid = ? AND a.status = 'published'`, [classId]);
    const [[completed]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessment_submissions sub
       INNER JOIN assessments a ON sub.assessment_id = a.assessment_id
       INNER JOIN class c ON a.cid = c.cid
       WHERE sub.sid = ? AND c.cid = ? AND sub.status = 'graded'`, [sid, classId]);
    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE c.cid = ? AND a.status = 'published' AND a.end_date >= CURDATE()
       AND a.assessment_id NOT IN (SELECT assessment_id FROM assessment_submissions WHERE sid = ?)`,
      [classId, sid]);
    const [[upcomingClasses]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM online_classes oc INNER JOIN class c ON oc.cid = c.cid
       WHERE c.cid = ? AND oc.scheduled_date >= CURDATE() AND oc.status = 'scheduled'`, [classId]);
    const [recent] = await pool.query(
      `SELECT a.*, sub.obtained_marks, sub.status AS submission_status
       FROM assessments a INNER JOIN class c ON a.cid = c.cid
       LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id AND sub.sid = ?
       WHERE c.cid = ? ORDER BY a.created_at DESC LIMIT 5`, [sid, classId]);

    res.json({
      profile: { ...student, displayName: req.user.studentName, classId, className: req.user.className, yearId: req.user.yearId },
      stats: {
        totalAssessments: totalAssessments?.cnt ?? 0,
        completed: completed?.cnt ?? 0,
        pending: pending?.cnt ?? 0,
        upcomingClasses: upcomingClasses?.cnt ?? 0,
      },
      recentAssessments: recent.map(normalizeAssessment),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.class_name, c.class_code FROM student s
       INNER JOIN class c ON s.class = c.cid WHERE s.sid = ? LIMIT 1`, [req.user.sid]);
    res.json({
      profile: rows[0] || null,
      session: { name: req.user.studentName, className: req.user.className, reg: req.user.reg },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
router.get('/notifications', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE sid = ? ORDER BY created_at DESC LIMIT 200', [req.user.sid]);
    const [[{ c }]] = await pool.query(
      'SELECT COUNT(*) AS c FROM notifications WHERE sid = ? AND is_read = 0', [req.user.sid]);
    res.json({ notifications: rows, unread: c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE notification_id = ? AND sid = ?', [req.params.id, req.user.sid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/notifications/clear-read', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE sid = ? AND is_read = 1', [req.user.sid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ASSESSMENTS (cursor-paginated)
// ============================================================
router.get('/assessments', async (req, res) => {
  const sid = req.user.sid;
  const studentClassId = req.user.classId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
  try {
    const params = [sid, sid, sid, sid, sid, sid, studentClassId];
    let sql = `
      SELECT a.*,
        (SELECT submission_id FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ? ORDER BY submission_id DESC LIMIT 1) AS submitted,
        (SELECT obtained_marks FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ? ORDER BY submission_id DESC LIMIT 1) AS obtained_marks,
        (SELECT status FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ? ORDER BY submission_id DESC LIMIT 1) AS submission_status,
        (SELECT feedback FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ? ORDER BY submission_id DESC LIMIT 1) AS feedback,
        (SELECT submission_date FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = ? ORDER BY submission_id DESC LIMIT 1) AS submission_date,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions,
        (SELECT status FROM assessment_waiting_room WHERE assessment_id = a.assessment_id AND sid = ? LIMIT 1) AS approval_status
       FROM assessments a
       WHERE a.cid = ? AND a.status = 'published'
         AND (a.end_date > CURDATE() OR (a.end_date = CURDATE() AND a.end_time >= CURTIME()))
         ${cursor ? 'AND a.assessment_id < ?' : ''}
       ORDER BY a.assessment_id DESC LIMIT ?`;
    if (cursor) params.push(cursor);
    params.push(limit + 1);

    const [rows] = await pool.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.json({
      assessments: page.map(normalizeAssessment),
      next_cursor: hasMore ? page[page.length - 1].assessment_id : null,
    });
  } catch (e) {
    req.log?.error({ err: e }, 'student assessments failed');
    res.status(500).json({ error: e.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const [graded] = await pool.query(
      `SELECT a.*, MAX(sub.obtained_marks) AS obtained_marks, MAX(sub.feedback) AS feedback,
              MAX(sub.graded_date) AS graded_date,
              (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions
       FROM assessments a INNER JOIN class c ON a.cid = c.cid
       INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE c.cid = ? AND sub.sid = ? AND sub.status = 'graded'
       GROUP BY a.assessment_id ORDER BY MAX(sub.graded_date) DESC`,
      [req.user.classId, req.user.sid]);
    const [[overall]] = await pool.query(
      `SELECT SUM(sub.obtained_marks) AS total_obtained, SUM(a.total_marks) AS total_possible,
              AVG((sub.obtained_marks / NULLIF(a.total_marks,0)) * 100) AS avg_percentage,
              COUNT(DISTINCT a.assessment_id) AS total_assessments
       FROM assessments a INNER JOIN class c ON a.cid = c.cid
       INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE c.cid = ? AND sub.sid = ? AND sub.status = 'graded'`,
      [req.user.classId, req.user.sid]);
    res.json({ results: graded.map(normalizeAssessment), overall: overall || {} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ATTENDANCE
// ============================================================
router.get('/attendance', async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT a.*, oc.title AS class_title, oc.start_time, oc.end_time
       FROM attendance a LEFT JOIN online_classes oc ON a.cid = oc.cid AND a.class_date = oc.scheduled_date
       WHERE a.sid = ? AND a.cid = ? ORDER BY a.class_date DESC LIMIT 60`,
      [req.user.sid, req.user.classId]);
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(class_date, '%Y-%m') AS month, COUNT(*) AS total,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
              SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late
       FROM attendance WHERE sid = ? AND cid = ?
       GROUP BY DATE_FORMAT(class_date, '%Y-%m') ORDER BY month DESC`,
      [req.user.sid, req.user.classId]);
    res.json({ records, monthly });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, t.fname, t.lname FROM announcements a
       INNER JOIN teacher t ON a.tid = t.tid WHERE a.cid = ?
       ORDER BY a.created_at DESC LIMIT 100`, [req.user.classId]);
    res.json({ announcements: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ONLINE CLASSES
// ============================================================
router.get('/online-classes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT oc.*, t.fname, t.lname,
        (SELECT COUNT(*) FROM attendance att WHERE att.cid = oc.cid AND att.sid = ? AND att.class_date = oc.scheduled_date) AS attended
       FROM online_classes oc INNER JOIN class c ON oc.cid = c.cid
       INNER JOIN teacher t ON oc.tid = t.tid WHERE c.cid = ? ORDER BY oc.scheduled_date DESC`,
      [req.user.sid, req.user.classId]);
    res.json({ classes: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/board', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query(
      `SELECT b.work_items, b.personal_items FROM online_class_boards b
       INNER JOIN online_classes oc ON oc.class_id = b.online_class_id
       WHERE b.online_class_id = ? AND oc.cid = ?`, [classId, req.user.classId]);
    if (rows.length === 0) return res.json({ workItems: [], personalItems: [] });
    const workItems = typeof rows[0].work_items === 'string' ? JSON.parse(rows[0].work_items) : (rows[0].work_items || []);
    const personalItems = typeof rows[0].personal_items === 'string' ? JSON.parse(rows[0].personal_items) : (rows[0].personal_items || []);
    res.json({ workItems, personalItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [messages] = await pool.query(
      `SELECT cm.chat_id, cm.online_class_id, cm.sender_id, cm.sender_type, cm.message, cm.created_at,
              CASE WHEN cm.sender_type = 'teacher'
                THEN COALESCE((SELECT CONCAT(COALESCE(fname,''),' ',COALESCE(lname,'')) FROM teacher WHERE tid = cm.sender_id), 'Teacher')
                ELSE COALESCE((SELECT CONCAT(COALESCE(firstname,''),' ',COALESCE(lastname,'')) FROM student WHERE sid = cm.sender_id), 'Student')
              END AS sender_name,
              CASE WHEN cm.sender_type = 'teacher' THEN 1 ELSE 0 END AS is_teacher
       FROM online_class_chat cm INNER JOIN online_classes oc ON oc.class_id = cm.online_class_id
       WHERE cm.online_class_id = ? AND oc.cid = ? ORDER BY cm.created_at ASC LIMIT 200`,
      [classId, req.user.classId]);
    res.json({ messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { message } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const [classes] = await pool.query(
      'SELECT class_id FROM online_classes WHERE class_id = ? AND cid = ?', [classId, req.user.classId]);
    if (!classes.length) return res.status(404).json({ error: 'Class not found' });
    const [insert] = await pool.query(
      `INSERT INTO online_class_chat (online_class_id, sender_id, sender_type, message, created_at)
       VALUES (?, ?, 'student', ?, NOW())`, [classId, req.user.sid, message.trim()]);
    const [srows] = await pool.query('SELECT firstname, lastname FROM student WHERE sid = ?', [req.user.sid]);
    const senderName = srows[0]
      ? `${srows[0].firstname || ''} ${srows[0].lastname || ''}`.trim() || 'Student' : 'Student';
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('chat-message', {
      chat_id: insert.insertId, online_class_id: classId, sender_id: req.user.sid,
      sender_type: 'student', sender_name: senderName, message: message.trim(),
      created_at: new Date().toISOString(), is_teacher: 0,
    });
    res.json({ ok: true, chat_id: insert.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/join', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const sid = req.user.sid;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const [cls] = await pool.query(
      'SELECT class_id, status FROM online_classes WHERE class_id = ? AND cid = ?', [classId, req.user.classId]);
    if (cls.length === 0) return res.status(404).json({ error: 'Class not found' });
    if (cls[0].status !== 'live' && cls[0].status !== 'ongoing')
      return res.status(400).json({ error: 'Class is not live yet' });
    const [existing] = await pool.query(
      'SELECT id, status FROM online_class_waiting_room WHERE online_class_id = ? AND sid = ?', [classId, sid]);
    let finalStatus = 'pending';
    if (existing.length > 0) {
      if (existing[0].status === 'rejected') {
        await pool.query(
          `UPDATE online_class_waiting_room SET status = 'pending', requested_at = NOW(),
                  approved_at = NULL, rejected_at = NULL WHERE id = ?`, [existing[0].id]);
        finalStatus = 'pending';
      } else if (existing[0].status === 'approved') finalStatus = 'approved';
    } else {
      await pool.query(
        `INSERT INTO online_class_waiting_room (online_class_id, sid, status, requested_at)
         VALUES (?, ?, 'pending', NOW())`, [classId, sid]);
    }
    if (finalStatus === 'pending') {
      const io = getIO(req);
      if (io) {
        const [srows] = await pool.query('SELECT firstname, lastname, reg FROM student WHERE sid = ?', [sid]);
        const s = srows[0] || {};
        io.to(`class-${classId}`).emit('join-request', {
          sid, firstname: s.firstname || '', lastname: s.lastname || '', reg: s.reg || '',
          requested_at: new Date().toISOString(),
        });
      }
    }
    res.json({
      ok: true, status: finalStatus,
      message: finalStatus === 'approved' ? 'Already admitted' : 'Waiting for teacher approval',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/join-status', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const sid = req.user.sid;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const [rows] = await pool.query(
      `SELECT wr.status, wr.approved_at, wr.rejected_at, oc.status AS class_status
       FROM online_class_waiting_room wr INNER JOIN online_classes oc ON oc.class_id = wr.online_class_id
       WHERE wr.online_class_id = ? AND wr.sid = ? AND oc.cid = ?`, [classId, sid, req.user.classId]);
    if (rows.length === 0) {
      const [classes] = await pool.query(
        'SELECT status FROM online_classes WHERE class_id = ? AND cid = ?', [classId, req.user.classId]);
      if (!classes.length) return res.status(404).json({ error: 'Class not found' });
      return res.json({ status: ['completed', 'cancelled'].includes(classes[0].status) ? 'class_ended' : 'not_requested' });
    }
    const row = rows[0];
    if (['completed', 'cancelled'].includes(row.class_status)) return res.json({ status: 'class_ended' });
    if (row.status === 'rejected' && row.approved_at && row.rejected_at) return res.json({ status: 'kicked' });
    res.json({ status: row.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/participants', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query(
      `SELECT p.*, CASE WHEN p.role = 'student'
              THEN (SELECT CONCAT(s.firstname, ' ', s.lastname) FROM student s WHERE s.sid = p.sid)
              ELSE (SELECT CONCAT(t.fname, ' ', t.lname) FROM teacher t WHERE t.tid = p.tid) END AS full_name
       FROM online_class_participants p
       WHERE p.online_class_id = ? AND p.last_seen >= (NOW() - INTERVAL 30 SECOND)
       ORDER BY p.role DESC, p.joined_at ASC`, [classId]);
    res.json({ participants: rows });
  } catch { res.json({ participants: [] }); }
});

router.post('/online-classes/:id/heartbeat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { mic_on, camera_on } = req.body;
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [approved] = await pool.query(
      `SELECT status FROM online_class_waiting_room WHERE online_class_id = ? AND sid = ? AND status = 'approved'`,
      [classId, req.user.sid]);
    if (approved.length === 0) return res.status(403).json({ error: 'Not approved to join' });
    await pool.query(
      `INSERT INTO online_class_participants (online_class_id, sid, role, mic_on, camera_on, last_seen)
       VALUES (?, ?, 'student', ?, ?, NOW())
       ON DUPLICATE KEY UPDATE mic_on = VALUES(mic_on), camera_on = VALUES(camera_on), last_seen = NOW()`,
      [classId, req.user.sid, mic_on ? 1 : 0, camera_on ? 1 : 0]);
    await pool.query(
      `INSERT INTO online_class_attendance (online_class_id, sid, joined_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE joined_at = COALESCE(joined_at, NOW())`, [classId, req.user.sid]);
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('peer-media-state', { sid: req.user.sid, micOn: !!mic_on, cameraOn: !!camera_on });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/raise-hand', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const io = getIO(req);
  if (io) io.to(`class-${classId}`).emit('peer-raised-hand', { sid: req.user.sid, raised: !!req.body.raised });
  res.json({ ok: true });
});

router.post('/online-classes/:id/reaction', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const io = getIO(req);
  if (io) io.to(`class-${classId}`).emit('peer-reaction', { sid: req.user.sid, emoji: String(req.body.emoji || '👍').slice(0, 4) });
  res.json({ ok: true });
});

// ============================================================
// ASSESSMENT WAITING ROOM — REQUEST START
// ============================================================
router.post('/assessments/:id/request-start', startRequestLimiter, async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const sid = req.user.sid;
  const tz = clientTz(req);

  try {
    const [assessment] = await pool.query(
      `SELECT a.* FROM assessments a WHERE a.assessment_id = ? AND a.status = 'published' AND a.cid = ?`,
      [assessmentId, req.user.classId]);
    if (assessment.length === 0) return res.status(404).json({ error: 'Assessment not found for your class' });
    const a = assessment[0];

    const startDt = parseDtInZone(a.start_date, a.start_time, tz);
    const endDt = parseDtInZone(a.end_date, a.end_time, tz);
    if (!startDt || !endDt) return res.status(500).json({ error: 'Assessment has invalid schedule dates.' });

    const now = new Date();
    if (now < startDt) {
      return res.status(400).json({ error: `Assessment has not opened yet. It opens on ${fmtInTz(startDt, tz)}.` });
    }
    if (now > endDt) return res.status(400).json({ error: 'Assessment has ended.' });

    const [existingSubmission] = await pool.query(
      `SELECT submission_id FROM assessment_submissions WHERE assessment_id = ? AND sid = ? LIMIT 1`,
      [assessmentId, sid]);
    if (existingSubmission.length > 0)
      return res.status(400).json({ error: 'You have already submitted this assessment.' });

    const [existingReq] = await pool.query(
      `SELECT id, status, approval_token, approval_token_expires_at, consumed_at
       FROM assessment_waiting_room WHERE assessment_id = ? AND sid = ?`, [assessmentId, sid]);

    let finalStatus, approvalToken = null;

    if (existingReq.length > 0) {
      const row = existingReq[0];
      const tokenValid = row.status === 'approved' && row.approval_token && !row.consumed_at &&
        row.approval_token_expires_at && new Date(row.approval_token_expires_at).getTime() > now.getTime();

      if (tokenValid) { finalStatus = 'approved'; approvalToken = row.approval_token; }
      else if (row.status === 'approved' && !tokenValid) {
        await pool.query(
          `UPDATE assessment_waiting_room SET status = 'pending', requested_at = NOW(),
                  approved_at = NULL, rejected_at = NULL, approval_token = NULL,
                  approval_token_expires_at = NULL, consumed_at = NULL WHERE id = ?`, [row.id]);
        finalStatus = 'pending';
      } else if (row.status === 'rejected') {
        await pool.query(
          `UPDATE assessment_waiting_room SET status = 'pending', requested_at = NOW(),
                  approved_at = NULL, rejected_at = NULL, approval_token = NULL,
                  approval_token_expires_at = NULL, consumed_at = NULL WHERE id = ?`, [row.id]);
        finalStatus = 'pending';
      } else finalStatus = 'pending';
    } else {
      await pool.query(
        `INSERT INTO assessment_waiting_room (assessment_id, sid, status, requested_at)
         VALUES (?, ?, 'pending', NOW())`, [assessmentId, sid]);
      finalStatus = 'pending';
    }

    if (finalStatus === 'pending') {
      const io = getIO(req);
      if (io) {
        const [srows] = await pool.query('SELECT firstname, lastname, reg FROM student WHERE sid = ?', [sid]);
        const s = srows[0] || {};
        io.to(`teacher-${a.tid}`).emit('assessment-request', {
          assessment_id: assessmentId, sid,
          firstname: s.firstname || '', lastname: s.lastname || '', reg: s.reg || '',
          title: a.title, requested_at: new Date().toISOString(),
        });
      }
    }

    res.json({
      ok: true, status: finalStatus, approval_token: approvalToken,
      message: finalStatus === 'approved' ? 'Already approved' : 'Waiting for teacher approval',
    });
  } catch (e) {
    req.log?.error({ err: e }, 'request-start failed');
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// REQUEST STATUS — tolerant of consumed/expired tokens
// ============================================================
router.get('/assessments/:id/request-status', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  try {
    const [rows] = await pool.query(
      `SELECT status, approval_token, approval_token_expires_at, consumed_at
         FROM assessment_waiting_room
        WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, req.user.sid]
    );

    if (rows.length === 0) return res.json({ status: 'not_requested' });

    const row = rows[0];

    // FIX: If approved and token exists, do NOT check expiry here.
    // Let the /take endpoint handle the actual expiry check.
    // This ensures the "Start Assessment" button stays visible.
    if (row.status === 'approved' && row.approval_token && !row.consumed_at) {
      return res.json({ status: 'approved', approval_token: row.approval_token });
    }

    // Approved but consumed → report approved without token
    if (row.status === 'approved' && row.consumed_at) {
      return res.json({ status: 'approved', approval_token: null });
    }

    // If it's pending or rejected
    res.json({ status: row.status, approval_token: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// TAKE ASSESSMENT
// ============================================================
router.get('/assessments/:id/take', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const providedToken = req.headers['x-approval-token'];
  if (!providedToken || typeof providedToken !== 'string')
    return res.status(403).json({ error: 'Missing approval token.' });
  const tz = clientTz(req);

  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.status = 'published' AND a.cid = ?`,
      [assessmentId, req.user.classId]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found for your class' });
    const assessment = assessments[0];

    const [approval] = await pool.query(
      `SELECT status, approval_token, approval_token_expires_at, consumed_at
       FROM assessment_waiting_room WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, req.user.sid]);
    const row = approval[0];
    if (!row || row.status !== 'approved' || !row.approval_token ||
        row.approval_token !== providedToken || row.consumed_at ||
        !row.approval_token_expires_at ||
        new Date(row.approval_token_expires_at).getTime() < Date.now()) {
      return res.status(403).json({ error: 'You must request and receive teacher approval before starting.' });
    }

    const startDt = parseDtInZone(assessment.start_date, assessment.start_time, tz);
    const endDt = parseDtInZone(assessment.end_date, assessment.end_time, tz);
    if (!startDt || !endDt) return res.status(500).json({ error: 'Assessment has invalid schedule dates.' });

    const now = new Date();
    if (now < startDt) return res.status(400).json({ error: `This assessment starts on ${fmtInTz(startDt, tz)}.` });
    if (now > endDt) return res.status(400).json({ error: 'This assessment has already ended.' });

    const [submissions] = await pool.query(
      `SELECT submission_id FROM assessment_submissions WHERE assessment_id = ? AND sid = ? LIMIT 1`,
      [assessmentId, req.user.sid]);
    if (submissions.length > 0) return res.status(400).json({ error: 'You have already submitted this assessment.' });

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text, option_a, option_b, option_c, option_d, marks
       FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);

    const candidates = [];
    if (assessment.duration_minutes) candidates.push(new Date(startDt.getTime() + assessment.duration_minutes * 60000));
    candidates.push(endDt);
    const hardDeadline = candidates.reduce((min, d) => (d < min ? d : min), candidates[0]);
    const remainingSeconds = Math.max(0, Math.floor((hardDeadline - now) / 1000));
    if (remainingSeconds <= 0) return res.status(400).json({ error: 'Your time for this assessment has expired.' });

    res.json({
      assessment: normalizeAssessment(assessment),
      questions,
      remaining_seconds: remainingSeconds,
      hard_deadline: hardDeadline.toISOString(),
    });
  } catch (e) {
    req.log?.error({ err: e }, 'take assessment failed');
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SUBMIT ASSESSMENT
// ============================================================
router.post('/assessments/:id/submit', submitLimiter, async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const { answers } = req.body;
  if (!assessmentId || !Array.isArray(answers)) return res.status(400).json({ error: 'Invalid submission data' });

  const providedToken = req.headers['x-approval-token'];
  if (!providedToken || typeof providedToken !== 'string')
    return res.status(403).json({ error: 'Missing approval token.' });

  const tz = clientTz(req);

  try {
    const [assessments] = await pool.query(
      `SELECT a.* FROM assessments a WHERE a.assessment_id = ? AND a.status = 'published' AND a.cid = ?`,
      [assessmentId, req.user.classId]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found for your class' });
    const assessment = assessments[0];

    const [approval] = await pool.query(
      `SELECT id, status, approval_token, approval_token_expires_at, consumed_at
       FROM assessment_waiting_room WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, req.user.sid]);
    const row = approval[0];
    if (!row || row.status !== 'approved' || !row.approval_token ||
        row.approval_token !== providedToken || row.consumed_at) {
      return res.status(403).json({ error: 'Invalid or expired approval token.' });
    }

    const startDt = parseDtInZone(assessment.start_date, assessment.start_time, tz);
    const endDt = parseDtInZone(assessment.end_date, assessment.end_time, tz);
    if (!startDt || !endDt) return res.status(500).json({ error: 'Assessment has invalid schedule dates.' });

    const now = new Date();
    const hardDeadline = assessment.duration_minutes
      ? new Date(startDt.getTime() + assessment.duration_minutes * 60000) : endDt;
    const finalDeadline = endDt < hardDeadline ? endDt : hardDeadline;
    const GRACE_MS = 60 * 1000;
    if (now.getTime() > finalDeadline.getTime() + GRACE_MS && !assessment.allow_late_submission)
      return res.status(400).json({ error: 'The time for this assessment has ended. Submission rejected.' });

    const [existing] = await pool.query(
      `SELECT submission_id FROM assessment_submissions WHERE assessment_id = ? AND sid = ? LIMIT 1`,
      [assessmentId, req.user.sid]);
    if (existing.length > 0) return res.status(400).json({ error: 'Already submitted' });

    const [insert] = await pool.query(
      `INSERT INTO assessment_submissions (assessment_id, sid, answers, status, submission_date)
       VALUES (?, ?, ?, 'submitted', NOW())`,
      [assessmentId, req.user.sid, JSON.stringify(answers)]);

    await pool.query(
      `UPDATE assessment_waiting_room SET consumed_at = NOW(), approval_token = NULL,
              approval_token_expires_at = NULL WHERE id = ?`, [row.id]);

    try {
      const [teachers] = await pool.query(
        `SELECT tid, title FROM assessments WHERE assessment_id = ?`, [assessmentId]);
      if (teachers.length > 0) {
        await pool.query(
          `INSERT INTO notifications (tid, title, message, link, created_at)
           VALUES (?, 'New Submission', ?, 'grade_submissions.php', NOW())`,
          [teachers[0].tid, `A student submitted the assessment "${teachers[0].title}".`]);
      }
    } catch (notifErr) { req.log?.warn({ err: notifErr }, 'notification failed'); }

    res.json({ ok: true, submission_id: insert.insertId, message: 'Assessment submitted successfully' });
  } catch (e) {
    req.log?.error({ err: e }, 'submit failed');
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// HEARTBEAT (anti-cheat telemetry)
// ============================================================
router.post('/assessments/:id/heartbeat', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const { warnings = 0, elapsed = 0 } = req.body || {};
  try {
    await pool.query(
      `INSERT INTO assessment_heartbeats (assessment_id, sid, warnings, elapsed, ip, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [assessmentId, req.user.sid, warnings, elapsed, req.ip]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;