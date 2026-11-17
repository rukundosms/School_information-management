// routes/teacher.js
const express = require('express');
const pool = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
const { questionSchema } = require('../schemas/assessment');

const router = express.Router();

// ============================================================================
// UPLOAD FOLDERS
// ============================================================================
const uploadDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const materialsDir = path.join(__dirname, '../uploads/materials');
if (!fs.existsSync(materialsDir)) fs.mkdirSync(materialsDir, { recursive: true });
const materialsUpload = multer({ dest: materialsDir, limits: { fileSize: 50 * 1024 * 1024 } });

// ============================================================================
// AUTH
// ============================================================================
function requireTeacher(req, res, next) {
  return requireAuth(['teacher'])(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const rawRole = req.user.role || req.user.userRole || req.user.user_type || '';
    const normalized = String(rawRole).toLowerCase().trim();
    if (normalized === 'teacher') {
      req.user.role = 'teacher';
      return next();
    }
    if (req.user.tid && req.user.tcode) {
      req.user.role = 'teacher';
      return next();
    }
    const uid = req.user.uid || (req.user.sub ? parseInt(req.user.sub, 10) : null);
    if (uid) {
      pool.query('SELECT tcode FROM user WHERE uid = ? LIMIT 1', [uid])
        .then(([rows]) => {
          if (rows.length > 0 && rows[0].tcode) {
            req.user.role = 'teacher';
            req.user.tcode = rows[0].tcode;
            return next();
          }
          return res.status(403).json({ error: 'Forbidden: not a teacher account' });
        })
        .catch(() => res.status(403).json({ error: 'Forbidden: not a teacher account' }));
      return;
    }
    return res.status(403).json({ error: 'Forbidden: not a teacher account' });
  });
}

router.use(requireTeacher);

// ============================================================================
// Helpers
// ============================================================================
function getIO(req) {
  try {
    return req.app.get('io') || null;
  } catch {
    return null;
  }
}

async function resolveTeacherId(req) {
  if (req.user?.tid) {
    const n = Number(req.user.tid);
    if (!isNaN(n) && n > 0) return n;
  }
  if (req.user?.tcode) {
    try {
      const [rows] = await pool.query('SELECT tid FROM teacher WHERE tcode = ? LIMIT 1', [req.user.tcode]);
      if (rows.length > 0) return Number(rows[0].tid);
    } catch {}
  }
  if (req.user?.uid) {
    try {
      const [users] = await pool.query('SELECT tcode FROM user WHERE uid = ? LIMIT 1', [req.user.uid]);
      if (users.length > 0 && users[0].tcode) {
        const [rows] = await pool.query('SELECT tid FROM teacher WHERE tcode = ? LIMIT 1', [users[0].tcode]);
        if (rows.length > 0) return Number(rows[0].tid);
      }
    } catch {}
  }
  if (req.user?.sub) {
    const uid = parseInt(req.user.sub, 10);
    if (uid) {
      try {
        const [users] = await pool.query('SELECT tcode FROM user WHERE uid = ? LIMIT 1', [uid]);
        if (users.length > 0 && users[0].tcode) {
          const [rows] = await pool.query('SELECT tid FROM teacher WHERE tcode = ? LIMIT 1', [users[0].tcode]);
          if (rows.length > 0) return Number(rows[0].tid);
        }
      } catch {}
    }
  }
  return null;
}

function isBuiltinRoom(meeting_link, meeting_type) {
  if (meeting_type === 'builtin') return true;
  if (typeof meeting_link === 'string' && meeting_link.startsWith('builtin://')) return true;
  return false;
}

function generateRoomCode() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

// ============================================================================
// DEBUG / HEALTH
// ============================================================================
router.get('/__whoami', async (req, res) => {
  const tid = await resolveTeacherId(req);
  res.json({
    ok: true,
    payload: req.user,
    resolvedTid: tid,
    headers: { authorization_present: !!req.headers.authorization },
  });
});

router.get('/__ping', (req, res) => {
  res.json({ ok: true, file: __filename, when: new Date().toISOString() });
});

// ============================================================================
// TEACHER CLASS PICKER
// ============================================================================
router.get('/teacher-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden: teacher identity not resolvable' });
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code
       FROM class c INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ? ORDER BY c.level, c.class_name`, [tid]
    );
    res.json({ classes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// ME / DASHBOARD
// ============================================================================
router.get('/me', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query('SELECT * FROM teacher WHERE tid = ? LIMIT 1', [tid]);
    const teacher = rows[0];
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [teacher.tcode]);
    res.json({ teacher });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/my-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [[active]] = await pool.query("SELECT year_id FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1");
    const yearId = active?.year_id || 0;

    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code,
        (SELECT COUNT(DISTINCT s.sid) FROM student s INNER JOIN student_promotion_log spl ON s.sid = spl.sid
         WHERE spl.to_class = c.cid AND spl.to_year = ? AND s.status = 'Active') AS student_count
       FROM permision p INNER JOIN class c ON p.cid = c.cid
       WHERE p.tid = ? ORDER BY c.level, c.class_name`, [yearId, tid]
    );

    for (const cls of classes) {
      const [modules] = await pool.query(
        `SELECT DISTINCT m.moid, m.mname, m.mcode FROM module m
         INNER JOIN permision p ON m.moid = p.mid
         WHERE p.tid = ? AND p.cid = ? ORDER BY m.mname`, [tid, cls.cid]
      );
      cls.modules = modules;
    }
    res.json({ classes, yearId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/dashboard', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [[classCount]] = await pool.query('SELECT COUNT(DISTINCT cid) as total FROM permision WHERE tid = ?', [tid]);
    const [[moduleCount]] = await pool.query('SELECT COUNT(DISTINCT mid) as total FROM permision WHERE tid = ?', [tid]);
    const [[studentCount]] = await pool.query(
      `SELECT COUNT(DISTINCT s.sid) as total FROM student s INNER JOIN permision p ON s.class = p.cid WHERE p.tid = ? AND s.status = 'Active'`, [tid]);

    let onlineCount = { total: 0 };
    try {
      const [[result]] = await pool.query(`SELECT COUNT(*) as total FROM online_classes WHERE tid = ? AND status IN ('scheduled', 'ongoing')`, [tid]);
      onlineCount = result;
    } catch {}

    res.json({
      stats: {
        totalClasses: classCount?.total || 0,
        totalModules: moduleCount?.total || 0,
        totalStudents: studentCount?.total || 0,
        pendingAssessments: 0,
        onlineClasses: onlineCount?.total || 0,
        attendanceRate: 0,
      },
      recentClasses: [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/announcements', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.class_name FROM announcements a JOIN class c ON a.cid = c.cid
       WHERE a.tid = ? ORDER BY a.created_at DESC LIMIT 100`, [tid]);
    res.json({ announcements: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// ONLINE CLASSES
// ============================================================================
router.get('/online-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  const cid = req.query.cid ? parseInt(req.query.cid, 10) : null;
  try {
    let sql = `SELECT oc.*, c.class_name, c.class_code, c.level FROM online_classes oc JOIN class c ON oc.cid = c.cid WHERE oc.tid = ?`;
    const params = [tid];
    if (cid) { sql += ' AND oc.cid = ?'; params.push(cid); }
    sql += ' ORDER BY oc.scheduled_date DESC, oc.start_time DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ classes: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/waiting-room', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [students] = await pool.query(
      `SELECT wr.*, s.firstname, s.lastname, s.reg, TIMESTAMPDIFF(MINUTE, wr.requested_at, NOW()) as minutes_waiting
       FROM online_class_waiting_room wr
       INNER JOIN student s ON wr.sid = s.sid
       INNER JOIN online_classes oc ON oc.class_id = wr.online_class_id
       WHERE wr.online_class_id = ? AND wr.status = 'pending' AND oc.tid = ?
       ORDER BY wr.requested_at ASC`, [classId, tid]
    );
    res.json({ students });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/approve-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body || {};
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(400).json({ error: 'Student ID required' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden: cannot resolve teacher identity' });

  try {
    const [classRows] = await pool.query('SELECT class_id FROM online_classes WHERE class_id = ? AND tid = ? LIMIT 1', [classId, tid]);
    if (classRows.length === 0) return res.status(404).json({ error: `Class ${classId} not found or not yours` });

    const [existing] = await pool.query(`SELECT id, status FROM online_class_waiting_room WHERE online_class_id = ? AND sid = ?`, [classId, sid]);
    if (existing.length === 0) return res.status(404).json({ error: `No waiting-room entry` });

    const currentStatus = existing[0].status;
    if (currentStatus === 'approved') return res.json({ ok: true, alreadyApproved: true });
    if (currentStatus === 'rejected') return res.status(400).json({ error: 'Student was rejected' });

    const [result] = await pool.query(`UPDATE online_class_waiting_room SET status = 'approved', approved_at = NOW() WHERE id = ?`, [existing[0].id]);
    if (result.affectedRows === 0) return res.status(500).json({ error: 'Update failed' });

    try {
      await pool.query(
        `INSERT INTO online_class_attendance (online_class_id, sid, joined_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE joined_at = COALESCE(joined_at, NOW())`, [classId, sid]);
    } catch (attErr) { console.warn('Attendance insert skipped:', attErr.message); }

    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('admission-approved', { sid: parseInt(sid, 10) });

    res.json({ ok: true, sid: parseInt(sid, 10), classId });
  } catch (e) {
    console.error('[approve-student]', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/online-classes/:id/reject-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body || {};
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!sid) return res.status(400).json({ error: 'Student ID required' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [classRows] = await pool.query('SELECT class_id FROM online_classes WHERE class_id = ? AND tid = ? LIMIT 1', [classId, tid]);
    if (classRows.length === 0) return res.status(404).json({ error: 'Class not found or not yours' });

    const [result] = await pool.query(
      `UPDATE online_class_waiting_room SET status = 'rejected', rejected_at = NOW()
       WHERE online_class_id = ? AND sid = ? AND status = 'pending'`, [classId, sid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Waiting student not found' });

    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('admission-rejected', { sid: parseInt(sid, 10) });

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/kick-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body || {};
  if (!classId || !sid) return res.status(400).json({ error: 'classId and sid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query('SELECT class_id FROM online_classes WHERE class_id = ? AND tid = ?', [classId, tid]);
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });

    await pool.query(
      `UPDATE online_class_waiting_room SET status = 'rejected', rejected_at = NOW()
       WHERE online_class_id = ? AND sid = ?`, [classId, sid]);

    const io = getIO(req);
    if (io) {
      io.to(`class-${classId}`).emit('kicked-student', { sid: parseInt(sid, 10) });
      io.kickStudent?.(classId, parseInt(sid, 10));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/mute-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid } = req.body || {};
  if (!classId || !sid) return res.status(400).json({ error: 'classId and sid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('force-media-state-room', { sid: parseInt(sid, 10), micOn: false, cameraOn: undefined });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/camera-student', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { sid, camera_on } = req.body || {};
  if (!classId || !sid) return res.status(400).json({ error: 'classId and sid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('force-media-state-room', { sid: parseInt(sid, 10), micOn: undefined, cameraOn: !!camera_on });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [messages] = await pool.query(
      `SELECT cm.chat_id, cm.online_class_id, cm.sender_id, cm.sender_type, cm.message, cm.created_at,
              CASE WHEN cm.sender_type = 'teacher' THEN
                (SELECT CONCAT(COALESCE(fname,''),' ',COALESCE(lname,'')) FROM teacher WHERE tid = cm.sender_id)
              ELSE
                (SELECT CONCAT(COALESCE(firstname,''),' ',COALESCE(lastname,'')) FROM student WHERE sid = cm.sender_id)
              END as sender_name,
              CASE WHEN cm.sender_type = 'teacher' THEN 1 ELSE 0 END as is_teacher
       FROM online_class_chat cm
       INNER JOIN online_classes oc ON oc.class_id = cm.online_class_id
       WHERE cm.online_class_id = ? AND oc.tid = ? ORDER BY cm.created_at ASC LIMIT 200`, [classId, tid]
    );
    res.json({ messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { message } = req.body || {};
  if (!classId || !message?.trim()) return res.status(400).json({ error: 'Message required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query('SELECT class_id FROM online_classes WHERE class_id = ? AND tid = ?', [classId, tid]);
    if (!classes.length) return res.status(404).json({ error: 'Class not found' });

    const [insert] = await pool.query(
      `INSERT INTO online_class_chat (online_class_id, sender_id, sender_type, message, created_at)
       VALUES (?, ?, 'teacher', ?, NOW())`, [classId, tid, message.trim()]);

    const [trows] = await pool.query('SELECT fname, lname FROM teacher WHERE tid = ?', [tid]);
    const senderName = trows[0] ? `${trows[0].fname || ''} ${trows[0].lname || ''}`.trim() || 'Teacher' : 'Teacher';

    const io = getIO(req);
    if (io) {
      io.to(`class-${classId}`).emit('chat-message', {
        chat_id: insert.insertId, online_class_id: classId, sender_id: tid, sender_type: 'teacher',
        sender_name: senderName, message: message.trim(), created_at: new Date().toISOString(), is_teacher: 1,
      });
    }
    res.json({ ok: true, chat_id: insert.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/online-classes/:id/start', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [r] = await pool.query(`UPDATE online_classes SET status='ongoing' WHERE class_id = ? AND tid = ?`, [classId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });

    const io = getIO(req);
    if (io?.emitClassStarted) io.emitClassStarted(classId);
    else if (io) io.to(`class-${classId}`).emit('class-started');

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/online-classes/:id/end', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [r] = await pool.query(`UPDATE online_classes SET status='completed' WHERE class_id = ? AND tid = ?`, [classId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });

    const io = getIO(req);
    if (io?.emitClassEnded) io.emitClassEnded(classId);
    else if (io) io.to(`class-${classId}`).emit('class-ended');

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:classId/cancel', async (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class id' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [r] = await pool.query(`UPDATE online_classes SET status='cancelled' WHERE class_id = ? AND tid = ?`, [classId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });

    const io = getIO(req);
    if (io) {
      io.to(`class-${classId}`).emit('class-cancelled');
      const room = io.sockets?.adapter?.rooms?.get(`class-${classId}`);
      if (room) for (const socketId of room) io.sockets.sockets.get(socketId)?.leave(`class-${classId}`);
    }
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/online-classes/:id/attendance', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [attendance] = await pool.query(
      `SELECT oca.*, s.firstname, s.lastname, s.reg FROM online_class_attendance oca
       INNER JOIN student s ON oca.sid = s.sid
       INNER JOIN online_classes oc ON oc.class_id = oca.online_class_id
       WHERE oca.online_class_id = ? AND oc.tid = ? ORDER BY oca.joined_at ASC`, [classId, tid]);
    res.json({ attendance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id/board', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT b.work_items, b.personal_items FROM online_class_boards b
       INNER JOIN online_classes oc ON oc.class_id = b.online_class_id
       WHERE b.online_class_id = ? AND oc.tid = ?`, [classId, tid]);
    if (rows.length === 0) return res.json({ workItems: [], personalItems: [] });
    const workItems = typeof rows[0].work_items === 'string' ? JSON.parse(rows[0].work_items) : (rows[0].work_items || []);
    const personalItems = typeof rows[0].personal_items === 'string' ? JSON.parse(rows[0].personal_items) : (rows[0].personal_items || []);
    res.json({ workItems, personalItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/online-classes/:id/board', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { workItems, personalItems } = req.body || {};
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query('SELECT class_id FROM online_classes WHERE class_id = ? AND tid = ?', [classId, tid]);
    if (!classes.length) return res.status(404).json({ error: 'Class not found' });
    const [existing] = await pool.query('SELECT board_id FROM online_class_boards WHERE online_class_id = ?', [classId]);
    const workJson = JSON.stringify(workItems || []);
    const personalJson = JSON.stringify(personalItems || []);
    if (existing.length > 0) {
      await pool.query('UPDATE online_class_boards SET work_items = ?, personal_items = ?, updated_at = NOW() WHERE online_class_id = ?', [workJson, personalJson, classId]);
    } else {
      await pool.query('INSERT INTO online_class_boards (online_class_id, work_items, personal_items) VALUES (?, ?, ?)', [classId, workJson, personalJson]);
    }
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('board-updated', { workItems: workItems || [], personalItems: personalItems || [] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const {
      title, description, meeting_link, meeting_id, meeting_password,
      scheduled_date, start_time, end_time, duration_minutes, status,
      meeting_type, room_code, waiting_room, auto_admit, mute_on_entry,
      allow_screen_share, allow_student_camera, reminder_minutes, buffer_minutes,
    } = req.body || {};

    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      duration = Math.round((end - start) / 60000);
    }
    if (duration && duration > 480) return res.status(400).json({ error: 'Class cannot exceed 8 hours' });

    const [r] = await pool.query(
      `UPDATE online_classes
       SET title=?, description=?, meeting_link=?, meeting_id=?, meeting_password=?,
           scheduled_date=?, start_time=?, end_time=?, duration_minutes=?, status=?,
           meeting_type=COALESCE(?, meeting_type), room_code=COALESCE(?, room_code),
           waiting_room=COALESCE(?, waiting_room), auto_admit=COALESCE(?, auto_admit),
           mute_on_entry=COALESCE(?, mute_on_entry), allow_screen_share=COALESCE(?, allow_screen_share),
           allow_student_camera=COALESCE(?, allow_student_camera), reminder_minutes=COALESCE(?, reminder_minutes),
           buffer_minutes=COALESCE(?, buffer_minutes)
       WHERE class_id = ? AND tid = ?`,
      [
        title?.trim(), description?.trim() || null, meeting_link?.trim(), meeting_id?.trim() || null, meeting_password?.trim() || null,
        scheduled_date, start_time, end_time, duration || null, status || 'scheduled',
        meeting_type ?? null, room_code ?? null,
        waiting_room !== undefined ? (waiting_room ? 1 : 0) : null,
        auto_admit !== undefined ? (auto_admit ? 1 : 0) : null,
        mute_on_entry !== undefined ? (mute_on_entry ? 1 : 0) : null,
        allow_screen_share !== undefined ? (allow_screen_share ? 1 : 0) : null,
        allow_student_camera !== undefined ? (allow_student_camera ? 1 : 0) : null,
        reminder_minutes ?? null, buffer_minutes ?? null, classId, tid,
      ]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [r] = await pool.query('DELETE FROM online_classes WHERE class_id = ? AND tid = ?', [classId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Class not found' });
    const io = getIO(req);
    if (io) io.to(`class-${classId}`).emit('class-ended');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT oc.*, c.class_name, c.class_code, c.level FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid WHERE oc.class_id = ? AND oc.tid = ?`, [classId, tid]);
    if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/schedule-class', async (req, res) => {
  const {
    cid, title, description, meeting_link, meeting_id, meeting_password,
    scheduled_date, start_time, end_time, duration_minutes,
    meeting_type, room_code, waiting_room, auto_admit, mute_on_entry,
    allow_screen_share, allow_student_camera, reminder_minutes,
    material_ids, buffer_minutes, recurrence, recurrence_count, dates, status,
  } = req.body || {};

  if (!cid || !title || !start_time || !end_time) return res.status(400).json({ error: 'Missing required fields' });

  const isBuiltin = isBuiltinRoom(meeting_link, meeting_type);
  if (!isBuiltin) {
    if (!meeting_link) return res.status(400).json({ error: 'Meeting link required' });
    if (!/^https?:\/\/.+/.test(meeting_link)) return res.status(400).json({ error: 'Invalid meeting link URL' });
  }

  const dateList = Array.isArray(dates) && dates.length > 0 ? dates.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : (scheduled_date ? [scheduled_date] : []);
  if (dateList.length === 0) return res.status(400).json({ error: 'At least one scheduled_date required' });
  if (dateList.length > 52) return res.status(400).json({ error: 'Max 52 sessions at once' });

  let duration = duration_minutes;
  if (!duration && start_time && end_time) {
    const start = new Date(`2000-01-01 ${start_time}`);
    const end = new Date(`2000-01-01 ${end_time}`);
    duration = Math.round((end - start) / 60000);
  }
  if (duration && duration > 480) return res.status(400).json({ error: 'Class cannot exceed 8 hours' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [perms] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ?', [tid, cid]);
    if (perms.length === 0) return res.status(403).json({ error: 'No permission for this class' });

    const [existing] = await pool.query(
      `SELECT class_id, title, scheduled_date, start_time, end_time FROM online_classes
       WHERE tid = ? AND cid = ? AND status NOT IN ('cancelled', 'completed')
         AND scheduled_date IN (?) AND start_time < ? AND end_time > ?`,
      [tid, cid, dateList, end_time, start_time]);
    if (existing.length > 0 && !req.body?.force) {
      return res.status(409).json({ error: 'Time conflict with existing class', conflicts: existing, hint: 'Set force: true to override' });
    }

    const finalRoomCode = isBuiltin ? (room_code || generateRoomCode()) : null;
    const finalLink = isBuiltin ? `builtin://${finalRoomCode}` : meeting_link.trim();

    const createdIds = [];
    const failed = [];

    for (const d of dateList) {
      try {
        const [r] = await pool.query(
          `INSERT INTO online_classes
           (cid, tid, title, description, meeting_link, meeting_id, meeting_password,
            scheduled_date, start_time, end_time, duration_minutes, status, created_at,
            meeting_type, room_code, waiting_room, auto_admit, mute_on_entry,
            allow_screen_share, allow_student_camera, reminder_minutes, buffer_minutes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cid, tid, title.trim(), description?.trim() || null, finalLink,
            isBuiltin ? null : (meeting_id?.trim() || null), isBuiltin ? null : (meeting_password?.trim() || null),
            d, start_time, end_time, duration || null, status || 'scheduled',
            meeting_type || (isBuiltin ? 'builtin' : 'external'), finalRoomCode,
            waiting_room !== undefined ? (waiting_room ? 1 : 0) : 1, auto_admit !== undefined ? (auto_admit ? 1 : 0) : 0,
            mute_on_entry !== undefined ? (mute_on_entry ? 1 : 0) : 1, allow_screen_share !== undefined ? (allow_screen_share ? 1 : 0) : 1,
            allow_student_camera !== undefined ? (allow_student_camera ? 1 : 0) : 1,
            reminder_minutes ?? 15, buffer_minutes ?? 5,
          ]
        );
        createdIds.push(r.insertId);
      } catch (rowErr) {
        console.error('Schedule row failed:', rowErr.message);
        failed.push({ date: d, error: rowErr.message });
      }
    }

    if (Array.isArray(material_ids) && material_ids.length > 0 && createdIds.length > 0) {
      try {
        for (const classId of createdIds) {
          for (const matId of material_ids) {
            await pool.query(`INSERT IGNORE INTO class_materials (class_id, material_id) VALUES (?, ?)`, [classId, matId]);
          }
        }
      } catch (matErr) { console.warn('Material attachment skipped:', matErr.message); }
    }

    const io = getIO(req);
    if (io && createdIds.length > 0) {
      for (const newId of createdIds) {
        io.to(`class-${newId}`).emit('class-scheduled', {
          class_id: newId, title: title.trim(),
          meeting_type: meeting_type || (isBuiltin ? 'builtin' : 'external'), room_code: finalRoomCode || '',
        });
      }
    }

    const message = createdIds.length === 1 ? 'Class scheduled successfully' : `${createdIds.length} classes scheduled successfully`;
    if (failed.length > 0) {
      return res.status(207).json({ ok: true, partial: true, classId: createdIds[0], classIds: createdIds, count: createdIds.length, failed, message: `${message}, but ${failed.length} failed` });
    }

    res.json({ ok: true, classId: createdIds[0], classIds: createdIds, count: createdIds.length, room_code: finalRoomCode, meeting_type: meeting_type || (isBuiltin ? 'builtin' : 'external'), message });
  } catch (e) {
    console.error('Error scheduling class:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/online-classes/:id/participants', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
              CASE WHEN p.role = 'student' THEN (SELECT CONCAT(s.firstname, ' ', s.lastname) FROM student s WHERE s.sid = p.sid)
              ELSE (SELECT CONCAT(t.fname, ' ', t.lname) FROM teacher t WHERE t.tid = p.tid) END AS full_name,
              CASE WHEN p.role = 'student' THEN (SELECT s.profile_photo FROM student s WHERE s.sid = p.sid) ELSE NULL END AS profile_photo
       FROM online_class_participants p
       WHERE p.online_class_id = ? AND p.last_seen >= (NOW() - INTERVAL 30 SECOND)
       ORDER BY p.role DESC, p.joined_at ASC`, [classId]);
    res.json({ participants: rows });
  } catch (e) { res.json({ participants: [] }); }
});

router.post('/online-classes/:id/heartbeat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { mic_on, camera_on } = req.body || {};
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    await pool.query(
      `INSERT INTO online_class_participants (online_class_id, tid, role, mic_on, camera_on, last_seen)
       VALUES (?, ?, 'teacher', ?, ?, NOW())
       ON DUPLICATE KEY UPDATE mic_on = VALUES(mic_on), camera_on = VALUES(camera_on), last_seen = NOW()`,
      [classId, tid, mic_on ? 1 : 0, camera_on ? 1 : 0]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// ASSESSMENTS
// ============================================================================
router.get('/assessments', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT a.*, (SELECT COUNT(*) FROM assessment_submissions WHERE assessment_id = a.assessment_id AND status IN ('submitted','graded')) AS total_submissions,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) AS total_questions
       FROM assessments a WHERE a.tid = ? ORDER BY a.created_at DESC`, [tid]);
    res.json({ assessments: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/assessment-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code, c.level FROM permision p INNER JOIN class c ON p.cid = c.cid
       WHERE p.tid = ? ORDER BY c.class_name`, [tid]);
    res.json({ classes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/create-assessment', async (req, res) => {
  const { cid, title, description, assessment_type, total_marks, passing_marks,
    duration_minutes, start_date, start_time, end_date, end_time,
    instructions, allow_late_submission, show_results_immediately } = req.body || {};

  if (!cid || !title || !assessment_type || !total_marks || !passing_marks) return res.status(400).json({ error: 'Missing required fields' });
  if (!start_date || !start_time || !end_date || !end_time) return res.status(400).json({ error: 'Start and end date/time required' });

  const startDt = new Date(`${start_date}T${start_time}`);
  const endDt = new Date(`${end_date}T${end_time}`);
  if (endDt <= startDt) return res.status(400).json({ error: 'End must be after start' });
  if (parseInt(passing_marks) > parseInt(total_marks)) return res.status(400).json({ error: 'Passing marks cannot exceed total' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [perms] = await pool.query('SELECT gid FROM permision WHERE tid = ? AND cid = ?', [tid, cid]);
    if (perms.length === 0) return res.status(403).json({ error: 'No permission' });

    const [r] = await pool.query(
      `INSERT INTO assessments
       (cid, tid, title, description, assessment_type, total_marks, passing_marks,
        duration_minutes, start_date, start_time, end_date, end_time, instructions,
        status, allow_late_submission, show_results_immediately)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [cid, tid, title.trim(), description?.trim() || null, assessment_type,
       parseInt(total_marks), parseInt(passing_marks), duration_minutes ? parseInt(duration_minutes) : null,
       start_date, start_time, end_date, end_time, instructions?.trim() || null,
       allow_late_submission ? 1 : 0, show_results_immediately ? 1 : 0]);
    res.json({ ok: true, assessment_id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/assessments/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name, c.class_code, c.level
       FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`, [assessmentId, tid]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found or no permission' });

    const [questions] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);

    res.json({ assessment: assessments[0], questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/assessments/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const { title, description, total_marks, passing_marks, duration_minutes,
          start_date, start_time, end_date, end_time, instructions } = req.body || {};

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [r] = await pool.query(
      `UPDATE assessments
       SET title = ?, description = ?, total_marks = ?, passing_marks = ?,
           duration_minutes = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, instructions = ?
       WHERE assessment_id = ? AND tid = ?`,
      [title, description || null, total_marks, passing_marks,
       duration_minutes || null, start_date, start_time, end_date, end_time, instructions || null,
       assessmentId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Assessment not found or no permission' });
    res.json({ ok: true, message: 'Assessment updated' });
  } catch (e) {
    console.error('Update assessment error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [a] = await pool.query('SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?', [assessmentId, tid]);
    if (a.length === 0) return res.status(404).json({ error: 'Assessment not found' });

    await pool.query('DELETE FROM assessment_questions WHERE assessment_id = ?', [assessmentId]);
    await pool.query('DELETE FROM assessment_submissions WHERE assessment_id = ?', [assessmentId]);
    await pool.query('DELETE FROM assessments WHERE assessment_id = ?', [assessmentId]);
    res.json({ ok: true, message: 'Assessment deleted completely' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// QUESTIONS
// ============================================================================
router.post('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
  const q = parsed.data;

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [a] = await pool.query('SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?', [assessmentId, tid]);
    if (a.length === 0) return res.status(404).json({ error: 'Assessment not found' });

    const [r] = await pool.query(
      `INSERT INTO assessment_questions
       (assessment_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assessmentId, q.question_type, q.question_text.trim(),
       q.option_a?.trim() || null, q.option_b?.trim() || null,
       q.option_c?.trim() || null, q.option_d?.trim() || null,
       q.correct_answer?.trim() || null, parseInt(q.marks)]);
    res.json({ ok: true, question_id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/assessment-questions/:id', async (req, res) => {
  const qid = parseInt(req.params.id, 10);
  if (!qid) return res.status(400).json({ error: 'Invalid question ID' });

  const { question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks } = req.body || {};
  if (!question_type || !question_text || !marks) return res.status(400).json({ error: 'Missing fields' });

  try {
    const [q] = await pool.query(
      `SELECT aq.question_id, a.tid
       FROM assessment_questions aq
       INNER JOIN assessments a ON aq.assessment_id = a.assessment_id
       WHERE aq.question_id = ?`, [qid]);
    if (q.length === 0) return res.status(404).json({ error: 'Question not found' });

    const tid = await resolveTeacherId(req);
    if (!tid || q[0].tid !== tid) return res.status(403).json({ error: 'Forbidden' });

    const [r] = await pool.query(
      `UPDATE assessment_questions
       SET question_type = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
           correct_answer = ?, marks = ?
       WHERE question_id = ?`,
      [question_type, question_text.trim(),
       option_a?.trim() || null, option_b?.trim() || null,
       option_c?.trim() || null, option_d?.trim() || null,
       correct_answer?.trim() || null, parseInt(marks), qid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Question not updated' });
    res.json({ ok: true, message: 'Question updated' });
  } catch (e) {
    console.error('Update question error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  try {
    const [rows] = await pool.query(`SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);
    res.json({ questions: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/assessment-questions/:id', async (req, res) => {
  const qid = parseInt(req.params.id, 10);
  if (!qid) return res.status(400).json({ error: 'Invalid question ID' });
  try {
    const [r] = await pool.query('DELETE FROM assessment_questions WHERE question_id = ?', [qid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// UPLOAD QUESTIONS
// ============================================================================
router.post('/assessments/:id/upload-questions', upload.single('file'), async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid assessment ID' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const tid = await resolveTeacherId(req);
  if (!tid) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [a] = await pool.query('SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?', [assessmentId, tid]);
    if (a.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Assessment not found' });
    }

    let text = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: req.file.path });
      text = result.value;
    } else if (ext === '.txt' || ext === '.csv') {
      text = fs.readFileSync(req.file.path, 'utf8');
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    fs.unlinkSync(req.file.path);

    const parsedQuestions = parseDocumentTextFinal(text);
    if (parsedQuestions.length === 0) {
      return res.status(400).json({ error: 'Could not auto-detect questions.' });
    }

    let insertedCount = 0;
    for (const q of parsedQuestions) {
      await pool.query(
        `INSERT INTO assessment_questions
         (assessment_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [assessmentId, q.question_type, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.marks]);
      insertedCount++;
    }

    res.json({ ok: true, count: insertedCount, message: `Successfully extracted ${insertedCount} questions.` });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload questions error:', e);
    res.status(500).json({ error: e.message });
  }
});

function parseDocumentTextFinal(text) {
  const questions = [];
  let cleanText = text
    .replace(/===== Page \d+ =====/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = cleanText.split(/(?=(?:^|\n)\s*\d+\.\s)/g).filter(b => b.trim().length > 0);

  for (const block of blocks) {
    let raw = block.trim();
    const numMatch = raw.match(/^\d+\.\s*(.*)/s);
    if (!numMatch) continue;
    raw = numMatch[1];

    // Flatten the text but PRESERVE the blank underscores (____)
    const flat = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    let question_type = 'essay';
    let question_text = '';
    let correct_answer = 'N/A';
    let marks = 1;
    let option_a = null, option_b = null, option_c = null, option_d = null, option_e = null;

    // Extract marks (e.g., "2 marks")
    const marksMatch = flat.match(/(\d+)\s*marks?/i);
    if (marksMatch) marks = parseInt(marksMatch[1], 10);

    // Detect options (A to E)
    const hasOptions = /A[\.\)]\s/.test(flat) && /B[\.\)]\s/.test(flat);

    if (hasOptions) {
      question_type = 'multiple_choice';
      const ansMatch = flat.match(/Answer:\s*([A-E])(?:\.|\s|$)/i);
      if (ansMatch) correct_answer = ansMatch[1].toUpperCase();
      else {
        const fallback = flat.match(/Answer:\s*(.+?)(?:\d+\.|$)/i);
        if (fallback) correct_answer = fallback[1].trim();
      }

      const optA = flat.match(/A[\.\)]\s*(.*?)(?=\s*B[\.\)])/);
      const optB = flat.match(/B[\.\)]\s*(.*?)(?=\s*C[\.\)])/);
      const optC = flat.match(/C[\.\)]\s*(.*?)(?=\s*D[\.\)])/);
      const optD = flat.match(/D[\.\)]\s*(.*?)(?=\s*E[\.\)]|\s*Answer:)/);
      const optE = flat.match(/E[\.\)]\s*(.*?)(?=\s*Answer:)/);

      if (optA) option_a = optA[1].trim();
      if (optB) option_b = optB[1].trim();
      if (optC) option_c = optC[1].trim();
      if (optD) option_d = optD[1].trim();
      if (optE) option_e = optE[1].trim();

      const qTextMatch = flat.match(/(.*?)\s*A[\.\)]\s/);
      question_text = qTextMatch ? qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim() : flat.split(/A[\.\)]\s/)[0].trim();

    } else if (/Answer:\s*(TRUE|FALSE)/i.test(flat)) {
      question_type = 'true_false';
      const ansMatch = flat.match(/Answer:\s*(TRUE|FALSE)/i);
      if (ansMatch) correct_answer = ansMatch[1].toUpperCase();
      const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
      if (qTextMatch) question_text = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();

    } else if (flat.includes('____')) {
      // FIX: Automatically mark as fill_blank
      question_type = 'fill_blank'; 
      const ansMatch = flat.match(/Answer:\s*(.*?)(?:\d+\.|$)/i);
      if (ansMatch) correct_answer = ansMatch[1].trim();
      const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
      if (qTextMatch) question_text = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();
      else question_text = flat.replace(/\d+\s*marks?\.?/i, '').trim();

    } else {
      question_type = 'essay';
      const ansMatch = flat.match(/Answer:\s*(.*?)(?:\d+\.|$)/i);
      if (ansMatch) correct_answer = ansMatch[1].trim();
      const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
      if (qTextMatch) question_text = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();
      else question_text = flat.replace(/\d+\s*marks?\.?/i, '').trim();
    }

    if (question_text && question_text.length > 3) {
      questions.push({
        question_type, question_text,
        option_a, option_b, option_c, option_d, option_e,
        correct_answer: correct_answer || 'N/A', marks,
      });
    }
  }
  return questions;
}

// ============================================================================
// PUBLISH
// ============================================================================
router.put('/assessments/:id/publish', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM assessment_questions WHERE assessment_id = ?', [assessmentId]);
    if (total === 0) return res.status(400).json({ error: 'Cannot publish with no questions' });
    const [r] = await pool.query(`UPDATE assessments SET status='published' WHERE assessment_id = ? AND tid = ?`, [assessmentId, tid]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Assessment not found' });
    res.json({ ok: true, message: 'Assessment published' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// RESET STUDENT ASSESSMENT
// ============================================================================
router.delete('/assessments/:id/reset-student/:sid', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const sid = parseInt(req.params.sid, 10);
  if (!assessmentId || !sid) return res.status(400).json({ error: 'Invalid IDs provided' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [a] = await pool.query('SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?', [assessmentId, tid]);
    if (a.length === 0) return res.status(404).json({ error: 'Assessment not found or no permission' });

    // 1. Delete the actual submission
    await pool.query('DELETE FROM assessment_submissions WHERE assessment_id = ? AND sid = ?', [assessmentId, sid]);
    
    // 2. FIX: Reset the waiting room so they can request again without stale tokens
    await pool.query(
      `UPDATE assessment_waiting_room
          SET status = 'pending',
              approved_at = NULL,
              rejected_at = NULL,
              approval_token = NULL,
              approval_token_expires_at = NULL,
              consumed_at = NULL,
              requested_at = NOW()
        WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, sid]
    );

    try {
      await pool.query(
        `INSERT INTO notifications (sid, title, message, link, created_at)
         VALUES (?, 'Assessment Reset', ?, 'student_assessments.php', NOW())`,
        [sid, `Your submission for an assessment has been reset. You can now retake it.`]);
    } catch (err) {}

    res.json({ ok: true, message: 'Student assessment reset successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ============================================================================
// GRADING
// ============================================================================
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
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name, c.class_code, c.level FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`, [assessmentId, tid]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, marks
       FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);
    const questionMap = {};
    questions.forEach(q => { questionMap[q.question_id] = q; });

    const [submissions] = await pool.query(
      `SELECT sub.*, s.firstname, s.lastname, s.reg FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid WHERE sub.assessment_id = ? ORDER BY sub.submission_date ASC`, [assessmentId]);

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
          const maxMarks = parseFloat(q.marks) || 0;
          const obtained = isCorrect ? maxMarks : 0;
          if (isCorrect) { correctCount++; autoScore += obtained; }
          else if (hasAnswer) wrongCount++;
          return { ...answer, is_correct: isCorrect, obtained };
        }
        if (answer.obtained) autoScore += answer.obtained;
        return answer;
      });

      return {
        submission_id: sub.submission_id, sid: sub.sid, firstname: sub.firstname, lastname: sub.lastname, reg: sub.reg,
        submission_date: sub.submission_date, answers: processedAnswers, obtained_marks: sub.obtained_marks,
        auto_score: autoScore, correct_count: correctCount, wrong_count: wrongCount, unanswered_count: unansweredCount,
        feedback: sub.feedback || '', status: sub.status, file_path: sub.file_path || null,
      };
    });

    res.json({ assessment, questions, submissions: submissionsData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/submissions/:id/grade', async (req, res) => {
  const submissionId = parseInt(req.params.id, 10);
  if (!submissionId) return res.status(400).json({ error: 'Invalid submission ID' });
  const { marks = {}, feedback = '' } = req.body || {};
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [subs] = await pool.query(
      `SELECT sub.*, a.assessment_id, a.total_marks, a.passing_marks, a.title, a.tid FROM assessment_submissions sub
       INNER JOIN assessments a ON sub.assessment_id = a.assessment_id WHERE sub.submission_id = ?`, [submissionId]);
    if (subs.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const sub = subs[0];
    if (sub.tid !== tid) return res.status(403).json({ error: 'Not your assessment' });

    const [questions] = await pool.query('SELECT question_id, marks FROM assessment_questions WHERE assessment_id = ?', [sub.assessment_id]);
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
      if (answer.obtained !== undefined && answer.obtained !== null) totalObtained += Number(answer.obtained) || 0;
      return answer;
    });

    await pool.query(
      `UPDATE assessment_submissions SET obtained_marks=?, answers=?, feedback=?, status='graded', graded_by=?, graded_date=NOW() WHERE submission_id = ?`,
      [totalObtained, JSON.stringify(answers), feedback || '', tid, submissionId]);

    const passed = totalObtained >= sub.passing_marks;
    try {
      await pool.query(
        `INSERT INTO notifications (sid, title, message, link, created_at) VALUES (?, 'Assessment Graded', ?, 'student_results.php', NOW())`,
        [sub.sid, `Your submission for "${sub.title}" has been graded. Score: ${totalObtained}/${sub.total_marks}`]);
    } catch {}

    res.json({ ok: true, obtained_marks: totalObtained, passed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// MANAGE ASSESSMENTS
// ============================================================================
router.get('/manage-assessments', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.status, a.assessment_type, a.created_at, c.class_name, c.class_code,
              (SELECT COUNT(*) FROM assessment_submissions s WHERE s.assessment_id = a.assessment_id) as submission_count
       FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE a.tid = ? ORDER BY a.created_at DESC`, [tid]);
    res.json({ assessments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// REPORTS
// ============================================================================
router.get('/report-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code, c.level FROM class c
       LEFT JOIN assessments a ON a.cid = c.cid AND a.tid = ?
       LEFT JOIN permision p ON p.cid = c.cid AND p.tid = ?
       WHERE a.assessment_id IS NOT NULL OR p.gid IS NOT NULL ORDER BY c.class_name`, [tid, tid]);
    res.json({ classes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/report-assessments/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT assessment_id, title, assessment_type, total_marks, passing_marks, status, created_at
       FROM assessments WHERE cid = ? AND tid = ? ORDER BY created_at DESC`, [cid, tid]);
    res.json({ assessments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/report-class-performance/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT a.assessment_id, a.title, a.assessment_type, a.total_marks, a.passing_marks,
              COUNT(DISTINCT sub.submission_id) as submissions, AVG(sub.obtained_marks) as avg_marks,
              MIN(sub.obtained_marks) as min_marks, MAX(sub.obtained_marks) as max_marks,
              SUM(CASE WHEN sub.obtained_marks >= a.passing_marks THEN 1 ELSE 0 END) as passed_count
       FROM assessments a LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id AND sub.status = 'graded'
       WHERE a.cid = ? AND a.tid = ? GROUP BY a.assessment_id ORDER BY a.created_at DESC`, [cid, tid]);
    const performance = rows.map(r => ({
      ...r, submissions: Number(r.submissions) || 0,
      avg_marks: r.avg_marks !== null ? Number(r.avg_marks) : 0,
      min_marks: r.min_marks !== null ? Number(r.min_marks) : 0,
      max_marks: r.max_marks !== null ? Number(r.max_marks) : 0,
      passed_count: Number(r.passed_count) || 0,
      passing_rate: r.submissions > 0 ? Number(((r.passed_count / r.submissions) * 100).toFixed(1)) : 0,
    }));
    res.json({ performance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/report-assessment/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE a.assessment_id = ? AND a.tid = ?`, [assessmentId, tid]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg, sub.submission_id, sub.submission_date, sub.obtained_marks, sub.status, sub.feedback
       FROM student s LEFT JOIN assessment_submissions sub ON s.sid = sub.sid AND sub.assessment_id = ?
       WHERE s.class = ? ORDER BY s.firstname, s.lastname`, [assessmentId, assessment.cid]);

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
          if (percentage >= 80) grade = 'A'; else if (percentage >= 70) grade = 'B'; else if (percentage >= 50) grade = 'C';
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// DOWNLOADS
// ============================================================================
router.get('/download-assessments', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.assessment_type, a.created_at, c.class_name, c.class_code,
              (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.assessment_id) as total_questions,
              (SELECT COUNT(*) FROM assessment_submissions s WHERE s.assessment_id = a.assessment_id AND s.status IN ('submitted','graded')) as total_submissions
       FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE a.tid = ? ORDER BY a.created_at DESC`, [tid]);
    for (const a of assessments) {
      const [students] = await pool.query(
        `SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg FROM assessment_submissions sub
         INNER JOIN student s ON sub.sid = s.sid WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
         ORDER BY s.lastname, s.firstname`, [a.assessment_id]);
      a.students = students;
    }
    res.json({ assessments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/download-answers/:assessmentId/excel', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE a.assessment_id = ? AND a.tid = ?`, [assessmentId, tid]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text, correct_answer, marks FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);
    const [submissions] = await pool.query(
      `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
       ORDER BY s.lastname, s.firstname`, [assessmentId]);
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/download-answers/:assessmentId/paper', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
  if (!assessmentId) return res.status(400).send('Invalid assessment ID');
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).send('Forbidden');

  try {
    const [schoolRows] = await pool.query('SELECT school_name, district, secter FROM school LIMIT 1');
    const school = schoolRows[0] || { school_name: 'SCHOOL NAME', district: '', secter: '' };

    const [teacherRows] = await pool.query('SELECT fname, lname FROM teacher WHERE tid = ?', [tid]);
    const teacherName = teacherRows[0] ? `${teacherRows[0].fname} ${teacherRows[0].lname}` : 'Teacher';

    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name, c.level FROM assessments a INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`, [assessmentId, tid]);
    if (assessments.length === 0) return res.status(404).send('Assessment not found');
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`, [assessmentId]);

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
        const isMC = q.question_type === 'multiple_choice';

        let optionsHtml = '';
        if (isMC) {
          optionsHtml = '<div class="options">';
          if (q.option_a) optionsHtml += `A. ${esc(q.option_a)}<br>`;
          if (q.option_b) optionsHtml += `B. ${esc(q.option_b)}<br>`;
          if (q.option_c) optionsHtml += `C. ${esc(q.option_c)}<br>`;
          if (q.option_d) optionsHtml += `D. ${esc(q.option_d)}<br>`;
          optionsHtml += '</div>';
        }

        const correctHtml = (isMC || q.question_type === 'true_false')
          ? `Correct: <strong>${esc(q.correct_answer)}</strong>`
          : nl2br(q.correct_answer || '');

        questionsHtml += `
          <div class="question-block">
            <div class="question-text">
              <strong>Question ${qNum}</strong> (${q.marks} marks)<br>${nl2br(q.question_text)}${optionsHtml}
            </div>
            <div class="student-answer">
              <strong>STUDENT'S ANSWER:</strong><br>${hasAnswer ? nl2br(studentAnswer) : '<em>No answer provided</em>'}
              ${['multiple_choice', 'true_false'].includes(q.question_type) ?
                `<div class="answer-status"><span class="${isCorrect ? 'tick' : 'cross'}">${isCorrect ? '✓ CORRECT' : '✗ WRONG'}</span></div>` : ''}
            </div>
            <div class="correct-answer"><strong>CORRECT/MODEL ANSWER:</strong><br>${correctHtml}</div>
            <div class="marks-box"><strong>Marks Obtained:</strong> ${obtained} / ${q.marks}</div>
          </div>`;
        qNum++;
      }

      const percentage = assessment.total_marks > 0 ? (totalScore / assessment.total_marks) * 100 : 0;
      const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';

      pages += `
        <div class="page">
          <div class="header">
            <div class="school-name">${esc(school.school_name).toUpperCase()}</div>
            <div class="school-meta">${esc(school.secter)}, ${esc(school.district)}</div>
            <div class="doc-type">STUDENT ANSWER SHEET</div>
          </div>
          <div class="assessment-info">
            <table>
              <tr><td><strong>Assessment Title:</strong></td><td>${esc(assessment.title)}</td>
                  <td><strong>Assessment Type:</strong></td><td style="text-transform: capitalize;">${esc(assessment.assessment_type)}</td></tr>
              <tr><td><strong>Class:</strong></td><td>${esc(assessment.class_name)} (${esc(assessment.level)})</td>
                  <td><strong>Teacher:</strong></td><td>${esc(teacherName)}</td></tr>
              <tr><td><strong>Total Marks:</strong></td><td>${assessment.total_marks}</td>
                  <td><strong>Passing Marks:</strong></td><td>${assessment.passing_marks}</td></tr>
              <tr><td colspan="4"><strong>Description:</strong> ${esc(assessment.description || 'N/A')}</td></tr>
            </table>
          </div>
          <div class="student-info">
            <table>
              <tr><td width="20%"><strong>Student Name:</strong></td><td width="30%">${esc(sub.firstname + ' ' + sub.lastname)}</td>
                  <td width="20%"><strong>Registration No:</strong></td><td width="30%">${esc(sub.reg)}</td></tr>
              <tr><td><strong>Submitted Date:</strong></td><td>${new Date(sub.submission_date).toLocaleString()}</td>
                  <td><strong>Status:</strong></td><td>${totalScore >= assessment.passing_marks ? 'PASSED' : 'FAILED'}</td></tr>
            </table>
          </div>
          <h3>QUESTIONS AND ANSWERS</h3>
          ${questionsHtml}
          <div class="score-summary">
            <table style="width:100%;text-align:center;">
              <tr><td><strong>Score:</strong><br>${totalScore} / ${assessment.total_marks}</td>
                  <td><strong>Percentage:</strong><br>${percentage.toFixed(1)}%</td>
                  <td><strong>Grade:</strong><br>${grade}</td></tr>
              <tr><td colspan="3"><strong>Result:</strong>
                ${totalScore >= assessment.passing_marks ? '<span style="color:green;">PASSED</span>' : '<span style="color:red;">FAILED</span>'}</td></tr>
            </table>
          </div>
          ${sub.feedback ? `<div style="margin-top:20px;padding:15px;background:#fff3cd;border-left:4px solid #ffc107;"><strong>EXAMINER FEEDBACK:</strong><br>${nl2br(sub.feedback)}</div>` : ''}
          <div class="footer">
            <table style="width:100%;margin-top:40px;">
              <tr><td style="border-top:1px solid #000;padding-top:10px;">Teacher's Signature: _________________</td>
                  <td style="border-top:1px solid #000;padding-top:10px;">Date: ${new Date().toLocaleDateString()}</td></tr>
            </table>
            <div style="margin-top:20px;">Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${esc(assessment.title)} - Student Answer Sheets</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: "Times New Roman", serif; background: white; padding: 20px; }
          .page { max-width: 900px; margin: 0 auto; page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 3px double #000; }
          .school-name { font-size: 28px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
          .school-meta { font-size: 14px; margin-top: 5px; color: #333; }
          .doc-type { font-size: 18px; font-weight: bold; margin-top: 15px; text-decoration: underline; }
          .assessment-info { margin-bottom: 15px; padding: 10px; border: 1px solid #000; background: #f9f9f9; }
          .assessment-info table, .student-info table { width: 100%; border-collapse: collapse; }
          .assessment-info td, .student-info td { padding: 6px; border-bottom: 1px dotted #ccc; font-size: 14px; }
          .student-info { margin-bottom: 25px; padding: 10px; border: 1px solid #000; background: #fff; }
          .question-block { margin-bottom: 25px; page-break-inside: avoid; }
          .question-text { font-weight: bold; margin-bottom: 10px; padding: 10px; background: #e8f4fd; border-left: 4px solid #2196F3; }
          .options { margin: 8px 0 8px 20px; font-size: 14px; font-weight: normal; }
          .student-answer { margin: 10px 0; padding: 12px; background: #f8f9fa; border-left: 3px solid #673AB7; }
          .correct-answer { margin: 10px 0; padding: 12px; background: #e6f4ea; border-left: 3px solid #34a853; }
          .marks-box { margin-top: 10px; text-align: right; border-top: 1px dashed #ccc; padding-top: 8px; }
          .answer-status { margin-top: 8px; }
          .tick { color: green; font-weight: bold; background: #d4edda; padding: 2px 8px; border-radius: 4px; }
          .cross { color: red; font-weight: bold; background: #f8d7da; padding: 2px 8px; border-radius: 4px; }
          .score-summary { margin-top: 30px; padding: 15px; border: 2px solid #000; background: #f0f0f0; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #555; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; padding: 15px; background: #e8f4fd; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #0d3d0d; color: #fff; border: none; border-radius: 6px; font-size: 15px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
          <p style="margin-top: 8px; font-size: 13px; color: #555;">The print dialog will open automatically.</p>
        </div>
        ${pages}
        <script>window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });</script>
      </body>
      </html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error('Paper generation error:', e);
    res.status(500).send('Error generating paper: ' + e.message);
  }
});

// ============================================================================
// MISC
// ============================================================================
router.post('/update-activity', async (req, res) => {
  try {
    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [req.user.tcode]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/teacher-modules/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [modules] = await pool.query(
      `SELECT m.moid, m.mname, m.mcode, m.module_type, m.credit FROM module m
       INNER JOIN permision p ON p.mid = m.moid WHERE m.class = ? AND p.tid = ? ORDER BY m.mname`, [cid, tid]);
    res.json({ modules });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/teacher-marks/:cid/:mid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  const mid = parseInt(req.params.mid, 10);
  if (!cid || !mid) return res.status(400).json({ error: 'Invalid cid or mid' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [infoRows] = await pool.query(
      `SELECT c.level, c.class_name, m.mname, m.credit FROM class c, module m WHERE c.cid = ? AND m.moid = ?`, [cid, mid]);
    const info = infoRows[0] || {};
    const [yearRows] = await pool.query("SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
    const activeYear = yearRows[0] || null;

    let students = [];
    if (activeYear) {
      const [stu] = await pool.query(
        `SELECT DISTINCT s.sid, s.firstname, s.lastname FROM student s
         INNER JOIN student_promotion_log spl ON spl.sid = s.sid
         WHERE s.status = 'Active' AND spl.to_year = ? AND spl.to_class = ? ORDER BY s.firstname, s.lastname`,
        [activeYear.year_id, cid]);
      students = stu;
    }

    const marksByStudent = {};
    if (activeYear && students.length > 0) {
      const [marks] = await pool.query(
        `SELECT sid, team, test, ttotal, exam, etotal FROM marks WHERE year = ? AND cid = ? AND mid = ? AND tid = ?`,
        [activeYear.year_id, cid, mid, tid]);
      marks.forEach(m => {
        if (!marksByStudent[m.sid]) marksByStudent[m.sid] = {};
        marksByStudent[m.sid][m.team] = { test: m.test, ttotal: m.ttotal, exam: m.exam, etotal: m.etotal };
      });
    }

    const autoTotal = (info.credit || 0) * 10;
    const [years] = await pool.query('SELECT year_id, year, status FROM year ORDER BY year DESC');
    const [assessments] = await pool.query('SELECT AssNo as id, AssName as name FROM assessment ORDER BY AssNo ASC');

    res.json({
      info, activeYear,
      students: students.map(s => ({ ...s, marks: marksByStudent[s.sid] || {} })),
      autoTotal, years, assessments,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/teacher-marks/selection', async (req, res) => {
  const { year, tearm, type, total } = req.body || {};
  if (!year || !tearm || !type || total === undefined) return res.status(400).json({ error: 'year, tearm, type, total required' });
  res.json({ ok: true });
});

router.get('/teacher-upload-marks/context', async (req, res) => {
  const { cid, mid, year, term, type } = req.query;
  if (!cid || !mid || !year || !term || !type) return res.status(400).json({ error: 'cid, mid, year, term, type required' });

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const typeInt = parseInt(type, 10);

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [perm] = await pool.query(`SELECT * FROM permision WHERE tid = ? AND cid = ? AND mid = ?`, [tid, cidInt, midInt]);
    if (perm.length === 0) return res.status(403).json({ error: 'You do not have permission for this class/module' });

    const [modRows] = await pool.query(
      `SELECT m.mname, m.credit, c.level, c.class_name FROM module m INNER JOIN class c ON c.cid = ? WHERE m.moid = ?`,
      [cidInt, midInt]);
    const module = modRows[0] || {};
    const total = (module.credit || 0) * 10;

    if (typeInt === 2) {
      const [testRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND test IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]);
      if (testRows[0].cnt === 0) return res.json({ success: true, mode: 'need_test_first', message: 'Test marks must be entered first before exams.', module, total, students: [] });

      const [examRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND exam IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]);
      if (examRows[0].cnt > 0) return res.json({ success: true, mode: 'already_exists', message: 'Exam marks for this assessment already exist.', module, total, students: [] });
    }

    if (typeInt === 1) {
      const [testRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM marks WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ? AND test IS NOT NULL`,
        [midInt, tid, cidInt, termInt, yearInt]);
      if (testRows[0].cnt > 0) return res.json({ success: true, mode: 'already_exists', message: 'Test marks for this assessment already exist.', module, total, students: [] });
    }

    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active' ORDER BY s.firstname ASC`, [cidInt, yearInt]);

    let finalStudents = students;
    if (finalStudents.length === 0) {
      const [alt] = await pool.query(`SELECT sid, firstname, lastname, reg FROM student WHERE class = ? AND status = 'Active' ORDER BY firstname ASC`, [cidInt]);
      finalStudents = alt;
    }

    const [existingMarks] = await pool.query(
      `SELECT sid, test, exam, ttotal, etotal FROM marks WHERE mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [midInt, tid, cidInt, termInt, yearInt]);
    const markMap = {};
    existingMarks.forEach(m => { markMap[m.sid] = typeInt === 1 ? m.test : m.exam; });

    res.json({
      success: true, mode: 'normal', module, total,
      students: finalStudents.map(s => ({ ...s, existingMark: markMap[s.sid] ?? '' })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/teacher-upload-marks/save', async (req, res) => {
  const { cid, mid, year, term, type, student_id, mark_data } = req.body || {};
  if (!cid || !mid || !year || !term || !type || !student_id) return res.json({ success: false, message: 'Missing required fields' });
  if (mark_data === undefined || mark_data === null || mark_data === '') return res.json({ success: false, message: 'No mark data received' });

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const typeInt = parseInt(type, 10);
  const sid = parseInt(student_id, 10);
  const mark = parseFloat(mark_data);

  if (isNaN(mark)) return res.json({ success: false, message: 'Invalid mark value' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [modRows] = await pool.query('SELECT credit FROM module WHERE moid = ?', [midInt]);
    const total = (modRows[0]?.credit || 0) * 10;
    if (mark < 0 || mark > total) return res.json({ success: false, message: `Mark must be between 0 and ${total}` });

    const today = new Date().toISOString().slice(0, 10);
    const [existing] = await pool.query(
      `SELECT mark_id FROM marks WHERE sid = ? AND mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [sid, midInt, tid, cidInt, termInt, yearInt]);

    if (typeInt === 1) {
      if (existing.length > 0) {
        await pool.query(`UPDATE marks SET test = ?, ttotal = ?, date = ? WHERE mark_id = ?`, [mark, total, today, existing[0].mark_id]);
      } else {
        await pool.query(`INSERT INTO marks (cid, sid, test, ttotal, mid, year, tid, team, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cidInt, sid, mark, total, midInt, yearInt, tid, termInt, today]);
      }
      return res.json({ success: true, message: 'Test mark saved successfully!' });
    } else if (typeInt === 2) {
      if (existing.length > 0) {
        await pool.query(`UPDATE marks SET exam = ?, etotal = ?, date = ? WHERE mark_id = ?`, [mark, total, today, existing[0].mark_id]);
      } else {
        await pool.query(`INSERT INTO marks (cid, sid, exam, etotal, mid, year, tid, team, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cidInt, sid, mark, total, midInt, yearInt, tid, termInt, today]);
      }
      return res.json({ success: true, message: 'Exam mark saved successfully!' });
    }
    res.json({ success: false, message: 'Invalid assessment type' });
  } catch (e) { res.json({ success: false, message: 'Error: ' + e.message }); }
});

router.get('/years-list', async (_req, res) => {
  try {
    const [years] = await pool.query('SELECT year_id, year, status FROM year ORDER BY year DESC');
    res.json({ years });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mymodule-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code FROM class c INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ? ORDER BY c.level, c.class_name`, [tid]);
    res.json({ classes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mymodules/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [modules] = await pool.query(
      `SELECT m.moid, m.mname, m.mcode, m.module_type, m.credit FROM module m
       INNER JOIN permision p ON p.mid = m.moid WHERE m.class = ? AND p.tid = ? ORDER BY m.mname`, [cid, tid]);
    res.json({ modules });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mymodule-years', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT m.year AS marks_year_id, y.year_id, y.year AS academic_year, y.status
       FROM marks m INNER JOIN year y ON m.year = y.year_id WHERE m.tid = ? ORDER BY y.year DESC`, [tid]);
    res.json({ years: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mymodule-terms/:yearId', async (req, res) => {
  const yearId = parseInt(req.params.yearId, 10);
  if (!yearId) return res.status(400).json({ error: 'Invalid year ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(`SELECT DISTINCT team FROM marks WHERE year = ? AND tid = ? ORDER BY team`, [yearId, tid]);
    res.json({ terms: rows.map(r => r.team) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/list-marks', async (req, res) => {
  const { cid, mid, year, term } = req.query;
  if (!cid || !mid || !year || !term) return res.status(400).json({ error: 'cid, mid, year, term required' });

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [yearRows] = await pool.query('SELECT year FROM year WHERE year_id = ?', [yearInt]);
    const academicYearName = yearRows[0]?.year || 'Unknown Year';

    const [infoRows] = await pool.query(`SELECT c.level, c.class_name, m.mname FROM class c, module m WHERE m.moid = ? AND c.cid = ?`, [midInt, cidInt]);
    const info = infoRows[0] || {};

    const [rows] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, m.test, m.ttotal, m.exam, m.etotal FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       LEFT JOIN marks m ON m.sid = s.sid AND m.team = ? AND m.year = ? AND m.cid = ? AND m.tid = ? AND m.mid = ?
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active' ORDER BY s.firstname ASC`,
      [termInt, yearInt, cidInt, tid, midInt, cidInt, yearInt]);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as cnt FROM marks WHERE cid = ? AND tid = ? AND mid = ? AND team = ? AND year = ?`,
      [cidInt, tid, midInt, termInt, yearInt]);

    res.json({ academicYearName, info, students: rows, markedCount: countRows[0].cnt || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/edit-marks', async (req, res) => {
  const { cid, mid, year, term } = req.query;
  if (!cid || !mid || !year || !term) return res.status(400).json({ error: 'cid, mid, year, term required' });

  const cidInt = parseInt(cid, 10);
  const midInt = parseInt(mid, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [infoRows] = await pool.query(`SELECT c.level, c.class_name, m.mname, m.credit FROM class c, module m WHERE m.moid = ? AND c.cid = ?`, [midInt, cidInt]);
    const info = infoRows[0] || {};
    const defaultTotal = (info.credit || 0) * 10;

    const [students] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, m.mark_id, m.test, m.ttotal, m.exam, m.etotal FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       LEFT JOIN marks m ON m.sid = s.sid AND m.team = ? AND m.year = ? AND m.cid = ? AND m.tid = ? AND m.mid = ?
       WHERE spl.to_class = ? AND spl.to_year = ? AND s.status = 'Active' ORDER BY s.firstname ASC`,
      [termInt, yearInt, cidInt, tid, midInt, cidInt, yearInt]);

    res.json({ info, defaultTotal, students });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/save-markedit', async (req, res) => {
  const { sid, mark_id, test, ttotal, exam, etotal, ototal, mtotal, module: midRaw, class: cidRaw, term, year } = req.body || {};
  if (!sid || !midRaw || !cidRaw || !term || !year) return res.json({ success: false, error: 'Missing required fields' });

  const cidInt = parseInt(cidRaw, 10);
  const midInt = parseInt(midRaw, 10);
  const yearInt = parseInt(year, 10);
  const termInt = parseInt(term, 10);
  const sidInt = parseInt(sid, 10);

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const nTest = test === '' || test === null ? null : Number(test);
    const nTTotal = ttotal === '' || ttotal === null ? null : Number(ttotal);
    const nExam = exam === '' || exam === null ? null : Number(exam);
    const nETotal = etotal === '' || etotal === null ? null : Number(etotal);
    const nOTotal = ototal === '' || ototal === null ? null : Number(ototal);
    const nMTotal = mtotal === '' || mtotal === null ? null : Number(mtotal);

    const [existing] = await pool.query(
      `SELECT mark_id FROM marks WHERE sid = ? AND mid = ? AND tid = ? AND cid = ? AND team = ? AND year = ?`,
      [sidInt, midInt, tid, cidInt, termInt, yearInt]);

    if (existing.length > 0) {
      await pool.query(`UPDATE marks SET test = ?, ttotal = ?, exam = ?, etotal = ?, ototal = ?, mtotal = ?, date = ? WHERE mark_id = ?`,
        [nTest, nTTotal, nExam, nETotal, nOTotal, nMTotal, today, existing[0].mark_id]);
      return res.json({ success: true, mark_id: existing[0].mark_id, message: 'Marks updated successfully' });
    } else {
      const [r] = await pool.query(
        `INSERT INTO marks (sid, mid, tid, cid, team, year, test, ttotal, exam, etotal, ototal, mtotal, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sidInt, midInt, tid, cidInt, termInt, yearInt, nTest, nTTotal, nExam, nETotal, nOTotal, nMTotal, today]);
      return res.json({ success: true, mark_id: r.insertId, message: 'Marks saved successfully' });
    }
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get('/view-results', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.created_at, c.class_name,
              COUNT(DISTINCT sub.submission_id) as total_submissions, AVG(sub.obtained_marks) as average_marks,
              MIN(sub.obtained_marks) as min_marks, MAX(sub.obtained_marks) as max_marks
       FROM assessments a JOIN class c ON a.cid = c.cid LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE a.tid = ? AND a.status = 'completed' GROUP BY a.assessment_id ORDER BY a.created_at DESC`, [tid]);
    res.json({ results: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// FORUMS
// ============================================================================
router.get('/forums', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT f.forum_id, f.cid, f.title, f.description, f.created_at, f.status, c.class_name,
              (SELECT COUNT(*) FROM forum_topics WHERE forum_id = f.forum_id) as topic_count
       FROM discussion_forums f JOIN class c ON f.cid = c.cid WHERE f.created_by = ? ORDER BY f.created_at DESC`, [tid]);
    res.json({ forums: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/forum-classes', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name FROM class c INNER JOIN permision p ON c.cid = p.cid WHERE p.tid = ? ORDER BY c.class_name`, [tid]);
    res.json({ classes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/forums', async (req, res) => {
  const { cid, title, description } = req.body || {};
  if (!cid || !title) return res.status(400).json({ error: 'cid and title required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [r] = await pool.query(`INSERT INTO discussion_forums (cid, title, description, created_by) VALUES (?, ?, ?, ?)`,
      [cid, title.trim(), description?.trim() || null, tid]);
    res.json({ ok: true, forum_id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// ATTENDANCE
// ============================================================================
router.get('/attendance-students', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [perm] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1', [tid, cid]);
    if (perm.length === 0) return res.status(403).json({ error: 'No permission for this class' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [students] = await pool.query(`SELECT s.sid, s.firstname, s.lastname, s.reg FROM student s WHERE s.class = ? ORDER BY s.firstname`, [className]);
    const [existing] = await pool.query(`SELECT sid, status FROM attendance WHERE cid = ? AND class_date = ?`, [cid, date]);
    const map = {};
    existing.forEach(a => { map[a.sid] = a.status; });

    res.json({ className, date, students: students.map(s => ({ ...s, attendance_status: map[s.sid] || '' })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/attendance', async (req, res) => {
  const { cid, date, attendance } = req.body || {};
  if (!cid || !date || !attendance || typeof attendance !== 'object') return res.status(400).json({ error: 'cid, date, attendance required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    for (const [sid, status] of Object.entries(attendance)) {
      if (!validStatuses.includes(status)) continue;
      const [existing] = await pool.query('SELECT attendance_id FROM attendance WHERE sid = ? AND cid = ? AND class_date = ?', [sid, cid, date]);
      if (existing.length > 0) {
        await pool.query('UPDATE attendance SET status = ?, marked_by = ? WHERE attendance_id = ?', [status, tid, existing[0].attendance_id]);
      } else {
        await pool.query(`INSERT INTO attendance (cid, sid, class_date, status, marked_by) VALUES (?, ?, ?, ?, ?)`, [cid, sid, date, status, tid]);
      }
    }
    res.json({ ok: true, message: 'Attendance saved successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/attendance-report', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!cid) return res.status(400).json({ error: 'cid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [perm] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1', [tid, cid]);
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [rows] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg,
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
         SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
         SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
         COUNT(a.attendance_id) as total_days
       FROM student s LEFT JOIN attendance a ON s.sid = a.sid AND a.cid = ? AND DATE_FORMAT(a.class_date, '%Y-%m') = ?
       WHERE s.class = ? GROUP BY s.sid ORDER BY s.firstname`, [cid, month, className]);

    res.json({
      className, month,
      rows: rows.map(r => ({ ...r, percentage: r.total_days > 0 ? Number(((r.present_days / r.total_days) * 100).toFixed(1)) : 0 })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// MATERIALS
// ============================================================================
router.get('/materials', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query(
      `SELECT m.material_id, m.cid, m.title, m.description, m.material_type, m.file_path, m.file_name, m.file_size, m.uploaded_at, c.class_name
       FROM study_materials m JOIN class c ON m.cid = c.cid WHERE m.tid = ? ORDER BY m.uploaded_at DESC`, [tid]);
    res.json({ materials: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/materials', materialsUpload.single('file'), async (req, res) => {
  const { cid, title, description, material_type } = req.body || {};
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!cid || !title || !material_type) {
    if (file.path) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'cid, title, material_type required' });
  }

  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4', 'zip'];
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!allowed.includes(ext)) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: `File type .${ext} not allowed. Allowed: ${allowed.join(', ')}` });
  }

  const tid = await resolveTeacherId(req);
  if (!tid) {
    fs.unlinkSync(file.path);
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const finalPath = path.join(materialsDir, safeName);
    fs.renameSync(file.path, finalPath);

    const relative = `uploads/materials/${safeName}`;
    const [r] = await pool.query(
      `INSERT INTO study_materials (cid, tid, title, description, material_type, file_path, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cid, tid, title.trim(), description?.trim() || null, material_type, relative, safeName, file.size]);
    res.json({ ok: true, material_id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/materials/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid material ID' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query('SELECT file_path FROM study_materials WHERE material_id = ? AND tid = ?', [id, tid]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const fp = rows[0].file_path;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);

    await pool.query('DELETE FROM study_materials WHERE material_id = ? AND tid = ?', [id, tid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// CLASS REPORTS
// ============================================================================
router.get('/class-reports', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [perm] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1', [tid, cid]);
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [[{ total: studentCount }]] = await pool.query('SELECT COUNT(*) as total FROM student WHERE class = ?', [className]);
    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.assessment_type, a.total_marks, AVG(sub.obtained_marks) as avg_marks,
              COUNT(DISTINCT sub.submission_id) as submissions
       FROM assessments a LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
       WHERE a.cid = ? GROUP BY a.assessment_id`, [cid]);

    const [[attendanceStats]] = await pool.query(
      `SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
              SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late, COUNT(*) as total
       FROM attendance WHERE cid = ?`, [cid]);

    const attendanceRate = attendanceStats.total > 0 ? Number(((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)) : 0;
    res.json({ className, studentCount, assessmentCount: assessments.length, attendanceRate, assessments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/student-performance', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [perm] = await pool.query('SELECT * FROM permision WHERE tid = ? AND cid = ? LIMIT 1', [tid, cid]);
    if (perm.length === 0) return res.status(403).json({ error: 'No permission' });

    const [classes] = await pool.query('SELECT class_name FROM class WHERE cid = ?', [cid]);
    const className = classes[0]?.class_name;
    if (!className) return res.status(404).json({ error: 'Class not found' });

    const [rows] = await pool.query(
      `SELECT s.sid, s.firstname, s.lastname, s.reg,
         (SELECT AVG(sub.obtained_marks) FROM assessment_submissions sub JOIN assessments a ON sub.assessment_id = a.assessment_id
          WHERE sub.sid = s.sid AND a.cid = ?) as avg_marks,
         (SELECT COUNT(*) FROM assessment_submissions sub JOIN assessments a ON sub.assessment_id = a.assessment_id
          WHERE sub.sid = s.sid AND a.cid = ?) as total_assessments,
         (SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) FROM attendance WHERE sid = s.sid AND cid = ?) as present_days,
         (SELECT COUNT(*) FROM attendance WHERE sid = s.sid AND cid = ?) as total_days
       FROM student s WHERE s.class = ? ORDER BY s.firstname`, [cid, cid, cid, cid, className]);

    const students = rows.map(r => {
      const avg = Number(r.avg_marks || 0);
      let grade = 'D';
      if (avg >= 80) grade = 'A'; else if (avg >= 70) grade = 'B'; else if (avg >= 50) grade = 'C';
      const attPercent = r.total_days > 0 ? Number(((r.present_days / r.total_days) * 100).toFixed(1)) : 0;
      return { ...r, avg: Number(avg.toFixed(2)), grade, attendance_percent: attPercent };
    });

    res.json({ className, students });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// ASSESSMENT WAITING ROOM — TEACHER SIDE (SINGLE, CORRECT)
// ============================================================================
router.get('/assessment-requests', async (req, res) => {
  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden: teacher identity not resolvable' });

  try {
    const [rows] = await pool.query(
      `SELECT awr.id, awr.assessment_id, awr.sid, awr.status, awr.requested_at,
              TIMESTAMPDIFF(MINUTE, awr.requested_at, NOW()) AS minutes_waiting,
              s.firstname, s.lastname, s.reg,
              a.title AS assessment_title, a.title, a.total_marks, a.tid
       FROM assessment_waiting_room awr
       INNER JOIN student s ON awr.sid = s.sid
       INNER JOIN assessments a ON awr.assessment_id = a.assessment_id
       WHERE a.tid = ? AND awr.status = 'pending'
       ORDER BY awr.requested_at ASC`,
      [tid]
    );
    res.json({ requests: rows });
  } catch (e) {
    console.error('[assessment-requests]', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/assessments/:id/approve/:sid', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const sid = parseInt(req.params.sid, 10);
  if (!assessmentId || !sid) return res.status(400).json({ error: 'Invalid params' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [own] = await pool.query(
      `SELECT assessment_id, tid, title FROM assessments WHERE assessment_id = ? AND tid = ?`,
      [assessmentId, tid]
    );
    if (!own.length) return res.status(404).json({ error: 'Assessment not found for this teacher' });

    const [wr] = await pool.query(
      `SELECT id FROM assessment_waiting_room WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, sid]
    );
    if (!wr.length) return res.status(404).json({ error: 'No waiting-room request to approve' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `UPDATE assessment_waiting_room
          SET status = 'approved',
              approved_at = NOW(),
              rejected_at = NULL,
              approval_token = ?,
              approval_token_expires_at = ?,
              consumed_at = NULL
        WHERE assessment_id = ? AND sid = ?`,
      [token, expiresAt, assessmentId, sid]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`assessment-${assessmentId}-${sid}`).emit('assessment-approved', {
        assessment_id: assessmentId,
        approval_token: token,
      });
      io.to(`student-${sid}`).emit('assessment-approved', {
        assessment_id: assessmentId,
        approval_token: token,
      });
      io.to(`teacher-${tid}`).emit('assessment-approved-ack', {
        assessment_id: assessmentId,
        sid,
      });
    }

    console.log(`[approve] assessment=${assessmentId} sid=${sid} token=${token.slice(0, 8)}…`);
    res.json({ ok: true, assessment_id: assessmentId, sid });
  } catch (e) {
    console.error('[approve]', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/assessments/:id/reject/:sid', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const sid = parseInt(req.params.sid, 10);
  if (!assessmentId || !sid) return res.status(400).json({ error: 'Invalid params' });

  const tid = await resolveTeacherId(req);
  if (!tid) return res.status(403).json({ error: 'Forbidden' });

  try {
    const [own] = await pool.query(
      `SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?`,
      [assessmentId, tid]
    );
    if (!own.length) return res.status(404).json({ error: 'Assessment not found for this teacher' });

    await pool.query(
      `UPDATE assessment_waiting_room
          SET status = 'rejected',
              rejected_at = NOW(),
              approval_token = NULL,
              approval_token_expires_at = NULL
        WHERE assessment_id = ? AND sid = ?`,
      [assessmentId, sid]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`assessment-${assessmentId}-${sid}`).emit('assessment-rejected', { assessment_id: assessmentId });
      io.to(`student-${sid}`).emit('assessment-rejected', { assessment_id: assessmentId });
      io.to(`teacher-${tid}`).emit('assessment-rejected-ack', { assessment_id: assessmentId, sid });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[reject]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;