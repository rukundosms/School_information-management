const express = require('express');
const pool = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ============ ASSESSMENT MANAGEMENT ============

router.get('/assessments', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT AssNo as id, AssName as name FROM assessment ORDER BY AssNo ASC');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/assessments', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Assessment name is required' });
  }
  try {
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM assessment');
    const count = countResult[0].total;
    if (count >= 2) {
      return res.status(400).json({ success: false, message: 'Maximum 2 assessments allowed' });
    }
    const [result] = await pool.query('INSERT INTO assessment (AssName) VALUES (?)', [name.trim()]);
    res.json({ success: true, message: 'Assessment added successfully', data: { id: result.insertId, name: name.trim() } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/assessments/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
  if (!name || name.trim() === '') return res.status(400).json({ success: false, message: 'Assessment name is required' });
  try {
    const [result] = await pool.query('UPDATE assessment SET AssName = ? WHERE AssNo = ?', [name.trim(), id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, message: 'Assessment updated successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
  try {
    const [result] = await pool.query('DELETE FROM assessment WHERE AssNo = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ TEACHER MANAGEMENT ============

router.get('/teachers', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT tid, fname, lname, tcode FROM teacher ORDER BY fname, lname');
    res.json({ teachers: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teachers', async (req, res) => {
  const { fname, lname, tcode } = req.body || {};
  if (!fname || !lname || !tcode) return res.status(400).json({ error: 'fname, lname, tcode required' });
  try {
    const [r] = await pool.query('INSERT INTO teacher (fname, lname, tcode) VALUES (?, ?, ?)', [String(fname).trim(), String(lname).trim(), String(tcode).trim()]);
    res.json({ ok: true, tid: r.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/teachers/:tid', async (req, res) => {
  const tid = parseInt(req.params.tid, 10);
  const { fname, lname, tcode } = req.body || {};
  if (!tid) return res.status(400).json({ error: 'Invalid teacher ID' });
  if (!fname || !lname || !tcode) return res.status(400).json({ error: 'fname, lname, tcode required' });
  try {
    const [result] = await pool.query('UPDATE teacher SET fname = ?, lname = ?, tcode = ? WHERE tid = ?', [String(fname).trim(), String(lname).trim(), String(tcode).trim(), tid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ ok: true, message: 'Teacher updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/teachers/:tid', async (req, res) => {
  const tid = parseInt(req.params.tid, 10);
  if (!tid) return res.status(400).json({ error: 'Invalid tid' });
  try {
    await pool.query('DELETE FROM teacher WHERE tid = ?', [tid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ CLASS MANAGEMENT ============

router.get('/classes-admin', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT cid, level, class_name, class_code, class_program as program_id FROM class ORDER BY level, class_name');
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/classes-admin', async (req, res) => {
  const { level, class_code, class_name, class_program } = req.body || {};
  if (!level || !class_code) return res.status(400).json({ error: 'level and class_code required' });
  const cn = class_name !== '' ? String(class_name).trim() : String(level).trim();
  try {
    const [r] = await pool.query('INSERT INTO class (level, class_code, class_name, class_program) VALUES (?, ?, ?, ?)', [String(level).trim(), String(class_code).trim(), cn, class_program || 0]);
    res.json({ ok: true, cid: r.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/classes-admin/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid cid' });
  try {
    await pool.query('DELETE FROM class WHERE cid = ?', [cid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ YEAR MANAGEMENT ============

router.get('/years-admin', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT year_id, year, status FROM year ORDER BY year_id DESC');
    res.json({ years: rows });
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

router.get('/years/active', async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT year_id, year, status FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1");
    res.json({ activeYear: rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/years-admin', async (req, res) => {
  const { year } = req.body || {};
  if (!year) return res.status(400).json({ error: 'year required' });
  try {
    const [r] = await pool.query('INSERT INTO year (year) VALUES (?)', [String(year).trim()]);
    res.json({ ok: true, year_id: r.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/years-admin/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await pool.query('DELETE FROM year WHERE year_id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ MODULE MANAGEMENT ============

router.get('/modules-admin', async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT m.*, c.level, c.class_name, c.class_code FROM module m LEFT JOIN class c ON m.class = c.cid ORDER BY m.mname`);
    res.json({ modules: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/modules-admin', async (req, res) => {
  const body = req.body || {};
  const classId = body.class;
  const { mname, mcode, module_type, credit } = body;
  if (!classId || !mname || !mcode) return res.status(400).json({ error: 'class (cid), mname, mcode required' });
  try {
    const [r] = await pool.query(`INSERT INTO module (class, mname, mcode, module_type, credit) VALUES (?, ?, ?, ?, ?)`, [parseInt(classId, 10), String(mname).trim(), String(mcode).trim(), module_type ? String(module_type) : 'general', credit != null ? String(credit) : '0']);
    res.json({ ok: true, moid: r.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/modules-admin/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await pool.query('DELETE FROM module WHERE moid = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ SCHOOL MANAGEMENT ============

router.get('/school-admin', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM school LIMIT 1');
    res.json({ school: rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/school-admin', async (req, res) => {
  const b = req.body || {};
  try {
    const [rows] = await pool.query('SELECT * FROM school LIMIT 1');
    if (!rows.length) return res.status(404).json({ error: 'No school row' });
    const cur = rows[0];
    await pool.query(`UPDATE school SET school_name=?, code=?, email=?, country=?, phone=?, secter=?, district=?, provence=? LIMIT 1`, [b.school_name ?? cur.school_name, b.code ?? cur.code, b.email ?? cur.email, b.country ?? cur.country, b.phone ?? cur.phone, b.secter ?? cur.secter, b.district ?? cur.district, b.provence ?? cur.provence]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ GRANT PERMISION ENDPOINTS ============

router.get('/grant-teachers', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT tid, fname, lname, tcode FROM teacher ORDER BY fname, lname');
    res.json({ teachers: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/grant-teacher/:tid', async (req, res) => {
  const tid = parseInt(req.params.tid, 10);
  if (!tid) return res.status(400).json({ error: 'Invalid teacher ID' });
  try {
    const [rows] = await pool.query('SELECT tid, fname, lname, tcode FROM teacher WHERE tid = ?', [tid]);
    if (rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ teacher: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/grant-classes', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT cid, level, class_name, class_code FROM class ORDER BY level, class_name');
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/grant-modules/:classId', async (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  try {
    const [rows] = await pool.query('SELECT moid, mname, mcode, module_type FROM module WHERE class = ? ORDER BY mname', [classId]);
    res.json({ modules: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/check-teacher-permision', async (req, res) => {
  const { cid, mid, tid } = req.body;
  if (!cid || !mid || !tid) return res.status(400).json({ error: 'cid, mid, and tid required' });
  try {
    const [rows] = await pool.query('SELECT * FROM permision WHERE cid = ? AND mid = ? AND tid = ?', [cid, mid, tid]);
    res.json({ exists: rows.length >= 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/grant-permision', async (req, res) => {
  const { cid, tid, mid } = req.body;
  if (!cid || !tid || !mid) return res.status(400).json({ error: 'cid, tid, and mid required' });
  try {
    const [existing] = await pool.query('SELECT * FROM permision WHERE cid = ? AND tid = ? AND mid = ?', [cid, tid, mid]);
    if (existing.length > 0) return res.status(400).json({ error: 'Permission already exists' });
    await pool.query('INSERT INTO permision (cid, tid, mid) VALUES (?, ?, ?)', [cid, tid, mid]);
    res.json({ success: true, message: 'Permission granted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ REVOKE PERMISION ENDPOINTS ============

router.get('/teacher-permitted-classes/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  if (!teacherId) return res.status(400).json({ error: 'Invalid teacher ID' });
  try {
    const [rows] = await pool.query(`SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code FROM permision p INNER JOIN class c ON p.cid = c.cid WHERE p.tid = ? ORDER BY c.level`, [teacherId]);
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/teacher-modules-revoke/:teacherId/:classId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const classId = parseInt(req.params.classId, 10);
  if (!teacherId || !classId) return res.status(400).json({ error: 'Invalid teacher ID or class ID' });
  try {
    const [rows] = await pool.query(`SELECT m.moid, m.mname, m.mcode, m.module_type FROM permision p INNER JOIN module m ON p.mid = m.moid WHERE p.tid = ? AND p.cid = ? ORDER BY m.mname`, [teacherId, classId]);
    res.json({ modules: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/revoke-permision', async (req, res) => {
  const { cid, tid, mid } = req.body;
  if (!cid || !tid || !mid) return res.status(400).json({ error: 'cid, tid, and mid required' });
  try {
    const [result] = await pool.query('DELETE FROM permision WHERE cid = ? AND tid = ? AND mid = ?', [cid, tid, mid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permission not found' });
    res.json({ success: true, message: 'Permission revoked successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ REPORT ENDPOINTS ============

router.get('/available-terms', async (req, res) => {
  const { classId, yearId } = req.query;
  if (!classId || !yearId) return res.status(400).json({ error: 'classId and yearId required' });
  try {
    const [rows] = await pool.query('SELECT DISTINCT team FROM marks WHERE cid = ? AND year = ? ORDER BY team', [classId, yearId]);
    const terms = rows.map(row => row.team);
    res.json({ terms, hasYearlyReport: terms.length > 2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/report-card', async (req, res) => {
  const { classId, yearId, term } = req.query;
  if (!classId || !yearId || !term) return res.status(400).json({ error: 'classId, yearId, and term required' });
  try {
    const [schoolRows] = await pool.query('SELECT * FROM school LIMIT 1');
    const school = schoolRows[0];
    const [yearRows] = await pool.query('SELECT year FROM year WHERE year_id = ?', [yearId]);
    const yearLabel = yearRows[0]?.year;
    const [classRows] = await pool.query('SELECT level, class_name FROM class WHERE cid = ?', [classId]);
    const classInfo = classRows[0];
    const [students] = await pool.query(`
      SELECT DISTINCT s.sid, s.firstname, s.lastname
      FROM student s
      WHERE s.status = 'Active'
      AND ((s.class = ? AND s.registed_year = ?) OR EXISTS (SELECT 1 FROM student_promotion_log spl WHERE spl.sid = s.sid AND spl.to_year = ? AND spl.to_class = ?))
      ORDER BY s.firstname
    `, [classId, yearId, yearId, classId]);

    const studentsData = [];
    for (const student of students) {
      const [conductRows] = await pool.query('SELECT * FROM conduct WHERE sid = ? AND year = ?', [student.sid, yearId]);
      const conduct = conductRows[0];
      let conductValue = 'Not entered';
      if (conduct) {
        if (term == 1) conductValue = conduct.term1 || 'Not entered';
        else if (term == 2) conductValue = conduct.term2 || 'Not entered';
        else if (term == 3) conductValue = conduct.term3 || 'Not entered';
      }
      const [marks] = await pool.query(`
        SELECT m.*, mo.mname, mo.module_type
        FROM marks m
        INNER JOIN module mo ON m.mid = mo.moid
        WHERE m.sid = ? AND m.year = ? AND m.team = ? AND m.cid = ?
      `, [student.sid, yearId, term, classId]);

      let test = 0, exam = 0, test_max = 0, exam_max = 0;
      const marksData = marks.map(mark => {
        const testVal = Number(mark.test) || 0;
        const examVal = Number(mark.exam) || 0;
        test += testVal;
        exam += examVal;
        test_max += Number(mark.ttotal) || 0;
        exam_max += Number(mark.etotal) || 0;
        return { mname: mark.mname, module_type: mark.module_type, test: testVal, exam: examVal, ttotal: mark.ttotal, etotal: mark.etotal };
      });
      const total_marks = test + exam;
      const max_marks = test_max + exam_max;
      const percentage = max_marks > 0 ? ((total_marks / max_marks) * 100).toFixed(2) : 0;
      studentsData.push({ ...student, class_name: classInfo?.class_name || '', level: classInfo?.level || '', conduct: conductValue, marks: marksData, test, exam, test_max, exam_max, total_marks, max_marks, percentage: parseFloat(percentage) });
    }
    const studentsWithMarks = studentsData.filter(s => s.marks.length > 0);
    studentsWithMarks.sort((a, b) => b.percentage - a.percentage);
    let rank = 1;
    for (let i = 0; i < studentsWithMarks.length; i++) {
      if (i > 0 && studentsWithMarks[i].percentage < studentsWithMarks[i-1].percentage) rank = i + 1;
      studentsWithMarks[i].rank = rank;
      studentsWithMarks[i].total_students = studentsWithMarks.length;
    }
    res.json({ school, yearLabel: yearLabel || 'N/A', term, students: studentsWithMarks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/yearly-report', async (req, res) => {
  const { classId, yearId } = req.query;
  if (!classId || !yearId) return res.status(400).json({ error: 'classId and yearId required' });
  try {
    const [schoolRows] = await pool.query('SELECT * FROM school LIMIT 1');
    const school = schoolRows[0];
    const [yearRows] = await pool.query('SELECT year FROM year WHERE year_id = ?', [yearId]);
    const yearLabel = yearRows[0]?.year;
    const [classRows] = await pool.query('SELECT level, class_name, class_code FROM class WHERE cid = ?', [classId]);
    const classInfo = classRows[0];
    const [students] = await pool.query(`
      SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg
      FROM student s
      WHERE s.status = 'Active'
      AND (s.class = ? OR EXISTS (SELECT 1 FROM student_promotion_log spl WHERE spl.sid = s.sid AND spl.to_class = ?))
      ORDER BY s.firstname
    `, [classId, classId]);
    if (students.length === 0) return res.json({ school, yearLabel: yearLabel || 'N/A', classInfo, totalStudents: 0, students: [] });
    const [modules] = await pool.query(`SELECT moid, mname, mcode, module_type, credit FROM module WHERE class = ? ORDER BY CASE WHEN module_type = 'specific' THEN 1 WHEN module_type = 'general' THEN 2 WHEN module_type = 'complementary' THEN 3 ELSE 4 END, mname`, [classId]);
    const [conductData] = await pool.query('SELECT sid, term1, term2, term3 FROM conduct WHERE year = ?', [yearId]);
    const conductMap = {};
    conductData.forEach(c => { conductMap[c.sid] = { term1: c.term1 || 0, term2: c.term2 || 0, term3: c.term3 || 0 }; });
    const [marksData] = await pool.query(`
      SELECT m.sid, m.mid, m.team, m.test, m.exam, m.ototal, m.ttotal, m.etotal, mo.mname, mo.module_type, mo.mcode, mo.credit
      FROM marks m
      INNER JOIN module mo ON m.mid = mo.moid
      WHERE m.year = ? AND m.cid = ?
      ORDER BY m.sid, m.mid, m.team
    `, [yearId, classId]);
    const marksByStudent = {};
    marksData.forEach(mark => {
      if (!marksByStudent[mark.sid]) marksByStudent[mark.sid] = {};
      if (!marksByStudent[mark.sid][mark.mid]) marksByStudent[mark.sid][mark.mid] = {};
      marksByStudent[mark.sid][mark.mid][mark.team] = mark;
    });
    const studentsData = [];
    for (const student of students) {
      const conduct = conductMap[student.sid] || { term1: 0, term2: 0, term3: 0 };
      let term1Total = 0, term1Max = 0, term2Total = 0, term2Max = 0, term3Total = 0, term3Max = 0;
      const modulesData = [];
      for (const module of modules) {
        const moduleMarks = marksByStudent[student.sid]?.[module.moid] || {};
        const term1Mark = moduleMarks[1] || { test: 0, exam: 0, ototal: 0, ttotal: 0, etotal: 0 };
        const term2Mark = moduleMarks[2] || { test: 0, exam: 0, ototal: 0, ttotal: 0, etotal: 0 };
        const term3Mark = moduleMarks[3] || { test: 0, exam: 0, ototal: 0, ttotal: 0, etotal: 0 };
        const term1Points = term1Mark.ototal || 0;
        const term2Points = term2Mark.ototal || 0;
        const term3Points = term3Mark.ototal || 0;
        const term1MaxPoints = (term1Mark.ttotal || 0) + (term1Mark.etotal || 0);
        const term2MaxPoints = (term2Mark.ttotal || 0) + (term2Mark.etotal || 0);
        const term3MaxPoints = (term3Mark.ttotal || 0) + (term3Mark.etotal || 0);
        term1Total += term1Points;
        term1Max += term1MaxPoints;
        term2Total += term2Points;
        term2Max += term2MaxPoints;
        term3Total += term3Points;
        term3Max += term3MaxPoints;
        const overallPoints = term1Points + term2Points + term3Points;
        const maxPoints = term1MaxPoints + term2MaxPoints + term3MaxPoints;
        const percentage = maxPoints > 0 ? ((overallPoints / maxPoints) * 100).toFixed(2) : 0;
        let status = 'NYC';
        if (module.module_type === 'complementary') status = parseFloat(percentage) >= 50 ? 'C' : 'NYC';
        else status = parseFloat(percentage) >= 70 ? 'C' : 'NYC';
        modulesData.push({ moid: module.moid, mcode: module.mcode, mname: module.mname, credit: module.credit || 0, module_type: module.module_type, term1_test: term1Mark.test || 0, term1_exam: term1Mark.exam || 0, term1_total: term1Points, term2_test: term2Mark.test || 0, term2_exam: term2Mark.exam || 0, term2_total: term2Points, term3_test: term3Mark.test || 0, term3_exam: term3Mark.exam || 0, term3_total: term3Points, overall_points: overallPoints, max_points: maxPoints, percentage: parseFloat(percentage), status });
      }
      const yearlyTotal = term1Total + term2Total + term3Total;
      const yearlyMax = term1Max + term2Max + term3Max;
      const yearlyPercentage = yearlyMax > 0 ? ((yearlyTotal / yearlyMax) * 100).toFixed(2) : 0;
      const term1Percentage = term1Max > 0 ? ((term1Total / term1Max) * 100).toFixed(2) : 0;
      const term2Percentage = term2Max > 0 ? ((term2Total / term2Max) * 100).toFixed(2) : 0;
      const term3Percentage = term3Max > 0 ? ((term3Total / term3Max) * 100).toFixed(2) : 0;
      const totalConduct = (conduct.term1 || 0) + (conduct.term2 || 0) + (conduct.term3 || 0);
      const avgConduct = totalConduct > 0 ? ((totalConduct * 40) / 120).toFixed(2) : '-';
      studentsData.push({ sid: student.sid, firstname: student.firstname, lastname: student.lastname, reg: student.reg, modules: modulesData, term1_total: term1Total, term1_max: term1Max, term1_percentage: parseFloat(term1Percentage), term1_conduct: conduct.term1 || '-', term2_total: term2Total, term2_max: term2Max, term2_percentage: parseFloat(term2Percentage), term2_conduct: conduct.term2 || '-', term3_total: term3Total, term3_max: term3Max, term3_percentage: parseFloat(term3Percentage), term3_conduct: conduct.term3 || '-', year_total: yearlyTotal, year_max: yearlyMax, yearly_percentage: parseFloat(yearlyPercentage), avg_conduct: avgConduct });
    }
    const studentsWithMarks = studentsData.filter(s => s.year_total > 0);
    studentsWithMarks.sort((a, b) => b.yearly_percentage - a.yearly_percentage);
    let currentRank = 1;
    for (let i = 0; i < studentsWithMarks.length; i++) {
      if (i > 0 && studentsWithMarks[i].yearly_percentage < studentsWithMarks[i-1].yearly_percentage) currentRank = i + 1;
      studentsWithMarks[i].yearly_rank = currentRank;
      studentsWithMarks[i].total_students = studentsWithMarks.length;
    }
    res.json({ school, yearLabel: yearLabel || 'N/A', classInfo, totalStudents: studentsWithMarks.length, students: studentsWithMarks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROCLAMATION/RANKING ENDPOINTS ============

router.get('/proclamation-years', async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT DISTINCT year FROM marks WHERE year IS NOT NULL AND year != '' ORDER BY year DESC`);
    res.json({ years: rows.map(row => row.year) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/proclamation-terms', async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'Year required' });
  try {
    const [rows] = await pool.query('SELECT DISTINCT team FROM marks WHERE year = ? AND team IS NOT NULL ORDER BY team', [year]);
    res.json({ terms: rows.map(row => row.team), hasYearlyReport: rows.length > 2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/proclamation', async (req, res) => {
  const { year, term } = req.query;
  if (!year || !term) return res.status(400).json({ error: 'Year and term required' });
  try {
    let query = '', queryParams = [];
    if (term == 1 || term == 2 || term == 3) {
      query = `SELECT m.sid, s.firstname, s.lastname, c.level, c.class_name, c.cid as class_id, SUM(COALESCE(m.ototal, 0)) as total_ototal, SUM(COALESCE(m.mtotal, 0)) as total_mtotal, COUNT(m.mid) as module_count FROM marks m INNER JOIN student s ON m.sid = s.sid LEFT JOIN class c ON s.class = c.cid WHERE m.year = ? AND m.team = ? GROUP BY m.sid, s.firstname, s.lastname, c.level, c.class_name, c.cid ORDER BY s.firstname`;
      queryParams = [year, term];
    } else {
      query = `SELECT m.sid, s.firstname, s.lastname, c.level, c.class_name, c.cid as class_id, SUM(COALESCE(m.ototal, 0)) as total_ototal, SUM(COALESCE(m.mtotal, 0)) as total_mtotal, COUNT(DISTINCT CONCAT(m.mid, '-', m.team)) as module_count FROM marks m INNER JOIN student s ON m.sid = s.sid LEFT JOIN class c ON s.class = c.cid WHERE m.year = ? GROUP BY m.sid, s.firstname, s.lastname, c.level, c.class_name, c.cid ORDER BY s.firstname`;
      queryParams = [year];
    }
    const [studentMarks] = await pool.query(query, queryParams);
    if (studentMarks.length === 0) return res.json({ termName: term == 1 ? '1st Term' : term == 2 ? '2nd Term' : term == 3 ? '3rd Term' : 'Annual', actualYear: year, totalStudentsWithMarks: 0, topPerformers: [], bottomPerformers: [], classes: [] });
    let studentPercentages = [];
    for (const student of studentMarks) {
      const obtained = student.total_ototal || 0, maximum = student.total_mtotal || 0;
      let percentage = maximum > 0 ? (obtained / maximum) * 100 : 0;
      let className = 'Unknown Class';
      if (student.level && student.class_name) className = `${student.level}${student.class_name}`;
      else if (student.class_name) className = student.class_name;
      if (obtained > 0 && maximum > 0) studentPercentages.push({ sid: student.sid, name: `${student.firstname} ${student.lastname}`, percentage, className, classId: student.class_id, obtained, maximum });
    }
    if (studentPercentages.length === 0) return res.json({ termName: term == 1 ? '1st Term' : term == 2 ? '2nd Term' : term == 3 ? '3rd Term' : 'Annual', actualYear: year, totalStudentsWithMarks: 0, topPerformers: [], bottomPerformers: [], classes: [] });
    studentPercentages.sort((a, b) => b.percentage - a.percentage);
    const topPerformers = studentPercentages.slice(0, 20).map((student, idx) => ({ sid: student.sid, name: student.name, class: student.className, percentage: Math.round(student.percentage * 100) / 100, rank: idx + 1, obtained: student.obtained, maximum: student.maximum }));
    const bottomPerformers = [...studentPercentages].sort((a, b) => a.percentage - b.percentage).slice(0, 20).map((student, idx) => ({ sid: student.sid, name: student.name, class: student.className, percentage: Math.round(student.percentage * 100) / 100, schoolRank: studentPercentages.length - (studentPercentages.findIndex(s => s.sid === student.sid) + 1) + 1, obtained: student.obtained, maximum: student.maximum }));
    const classMap = new Map();
    for (const student of studentPercentages) { if (!classMap.has(student.className)) classMap.set(student.className, []); classMap.get(student.className).push(student); }
    const classesData = [];
    for (const [className, students] of classMap.entries()) {
      students.sort((a, b) => b.percentage - a.percentage);
      let currentRank = 1, prevPercentage = -1;
      const studentsData = [];
      for (let i = 0; i < students.length; i++) {
        if (students[i].percentage !== prevPercentage && i > 0) currentRank = i + 1;
        else if (i === 0) currentRank = 1;
        studentsData.push({ sid: students[i].sid, name: students[i].name, percentage: Math.round(students[i].percentage * 100) / 100, classRank: currentRank, obtained: students[i].obtained, maximum: students[i].maximum });
        prevPercentage = students[i].percentage;
      }
      classesData.push({ className, studentsWithMarks: students.length, students: studentsData });
    }
    res.json({ termName: term == 1 ? '1st Term' : term == 2 ? '2nd Term' : term == 3 ? '3rd Term' : 'Annual', actualYear: year, totalStudentsWithMarks: studentPercentages.length, topPerformers, bottomPerformers, classes: classesData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ PROMOTION LOG ENDPOINTS ============

router.get('/promotion-log', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT pl.*, fy.year as from_year_name, ty.year as to_year_name FROM student_promotion_log pl LEFT JOIN year fy ON pl.from_year = fy.year_id LEFT JOIN year ty ON pl.to_year = ty.year_id ORDER BY pl.created_at DESC LIMIT 200`);
    res.json({ log: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/process-promotion', async (req, res) => {
  const { fromYear, toYear, promotedMarks } = req.body;
  if (!fromYear || !toYear || promotedMarks === undefined) return res.status(400).json({ error: 'fromYear, toYear, and promotedMarks required' });
  if (fromYear === toYear) return res.status(400).json({ error: 'From Year and To Year cannot be the same' });
  try {
    const [students] = await pool.query(`SELECT s.sid, s.class, s.program_id, r.yearl_pass FROM student s INNER JOIN ranks r ON s.sid = r.sit WHERE r.yearl_pass > 0`);
    if (students.length === 0) return res.json({ message: 'No students found with marks > 0', stats: { total: 0, promoted: 0, repeated: 0, graduated: 0, skipped: 0 }, students: [] });
    let promotedCount = 0, repeatedCount = 0, graduatedCount = 0, skippedCount = 0;
    const processedStudents = [];
    for (const student of students) {
      const [existing] = await pool.query('SELECT id FROM student_promotion_log WHERE sid = ? AND to_year = ?', [student.sid, toYear]);
      if (existing.length > 0) { skippedCount++; processedStudents.push({ id: student.sid, action: 'skipped', reason: 'Already promoted to this year' }); continue; }
      const [classInfo] = await pool.query('SELECT * FROM class WHERE cid = ? AND class_program = ?', [student.class, student.program_id]);
      if (classInfo.length === 0) { processedStudents.push({ id: student.sid, action: 'error', reason: 'Class not found' }); continue; }
      const currentClass = classInfo[0];
      const currentLevel = currentClass.class_level || 0;
      const programId = currentClass.class_program || student.program_id;
      const nextLevel = currentLevel + 1;
      const [nextClass] = await pool.query('SELECT cid FROM class WHERE class_program = ? AND class_level = ? LIMIT 1', [programId, nextLevel]);
      const nextClassExists = nextClass.length > 0;
      const studentMarks = student.yearl_pass;
      if (studentMarks >= promotedMarks) {
        if (nextClassExists) {
          await pool.query(`INSERT INTO student_promotion_log (sid, total_marks, from_class, to_class, from_year, to_year, program_id, decision) VALUES (?, ?, ?, ?, ?, ?, ?, 'Promoted')`, [student.sid, studentMarks, student.class, nextClass[0].cid, fromYear, toYear, programId]);
          promotedCount++;
          processedStudents.push({ id: student.sid, action: 'promoted', marks: studentMarks, fromClass: student.class, toClass: nextClass[0].cid });
        } else {
          await pool.query(`INSERT INTO student_promotion_log (sid, total_marks, from_class, from_year, to_year, program_id, decision) VALUES (?, ?, ?, ?, ?, ?, 'Graduated')`, [student.sid, studentMarks, student.class, fromYear, toYear, programId]);
          graduatedCount++;
          processedStudents.push({ id: student.sid, action: 'graduated', marks: studentMarks, reason: 'No next class available' });
        }
      } else {
        if (nextClassExists) {
          await pool.query(`INSERT INTO student_promotion_log (sid, total_marks, from_class, to_class, from_year, to_year, program_id, decision) VALUES (?, ?, ?, ?, ?, ?, ?, 'Repeated')`, [student.sid, studentMarks, student.class, student.class, fromYear, toYear, programId]);
          repeatedCount++;
          processedStudents.push({ id: student.sid, action: 'repeated', marks: studentMarks, reason: `Marks below threshold (${studentMarks}% < ${promotedMarks}%)` });
        } else {
          await pool.query(`INSERT INTO student_promotion_log (sid, total_marks, from_class, from_year, to_year, program_id, decision) VALUES (?, ?, ?, ?, ?, ?, 'Graduated')`, [student.sid, studentMarks, student.class, fromYear, toYear, programId]);
          graduatedCount++;
          processedStudents.push({ id: student.sid, action: 'graduated', marks: studentMarks, reason: 'No next class available (completed program)' });
        }
      }
    }
    res.json({ message: `✅ Promotion process completed! Total: ${students.length}, Promoted: ${promotedCount}, Repeated: ${repeatedCount}, Graduated: ${graduatedCount}, Skipped: ${skippedCount}`, stats: { total: students.length, promoted: promotedCount, repeated: repeatedCount, graduated: graduatedCount, skipped: skippedCount }, students: processedStudents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ STUDENT MANAGEMENT ENDPOINTS ============

router.get('/students-in-class', async (req, res) => {
  const cid = parseInt(req.query.cid, 10);
  if (!cid) return res.status(400).json({ error: 'cid required' });

  try {
    const [[active]] = await pool.query("SELECT year_id FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1");
    const yearId = active?.year_id;

    if (!yearId) {
      return res.status(400).json({ error: 'No active year found' });
    }

    const [classInfo] = await pool.query('SELECT class_program FROM class WHERE cid = ?', [cid]);
    const classProgram = classInfo[0]?.class_program || 0;

    const [students] = await pool.query(
      `SELECT DISTINCT s.sid, s.firstname, s.lastname, s.district, s.secter, s.status, 
              s.decission as decision, s.reg, s.class, s.program_id
       FROM student s
       INNER JOIN student_promotion_log spl ON s.sid = spl.sid
       WHERE spl.to_class = ? AND spl.to_year = ? AND spl.program_id = ?
       ORDER BY s.firstname`,
      [cid, yearId, classProgram]
    );

    res.json({ students, yearId });
  } catch (e) {
    console.error('Error fetching students:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/students/:sid/status', async (req, res) => {
  const sid = parseInt(req.params.sid, 10);
  const { status } = req.body;

  if (!sid) return res.status(400).json({ error: 'Invalid student ID' });
  if (!status || !['Active', 'Inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  try {
    const [result] = await pool.query('UPDATE student SET status = ? WHERE sid = ?', [status, sid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ ok: true, message: 'Status updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:sid/decision', async (req, res) => {
  const sid = parseInt(req.params.sid, 10);
  const { decision } = req.body;

  if (!sid) return res.status(400).json({ error: 'Invalid student ID' });

  try {
    const [result] = await pool.query('UPDATE student SET decission = ? WHERE sid = ?', [decision || '', sid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found' });
    if (decision && decision !== '') {
      await pool.query(`UPDATE student_promotion_log SET decision = ? WHERE sid = ? ORDER BY log_id DESC LIMIT 1`, [decision, sid]);
    }
    res.json({ ok: true, message: 'Decision updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:sid', async (req, res) => {
  const sid = parseInt(req.params.sid, 10);
  const { firstname, lastname, reg, district, secter, status, decision } = req.body || {};

  if (!sid) return res.status(400).json({ error: 'Invalid student ID' });
  if (!firstname || !lastname) return res.status(400).json({ error: 'firstname and lastname are required' });

  try {
    const [result] = await pool.query(
      `UPDATE student SET firstname = ?, lastname = ?, reg = ?, district = ?, secter = ?, status = ?, decission = ? WHERE sid = ?`,
      [String(firstname).trim(), String(lastname).trim(), reg || null, district || null, secter || null, status || 'Active', decision || '', sid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found' });
    if (decision && decision !== '') {
      await pool.query(`UPDATE student_promotion_log SET decision = ? WHERE sid = ? ORDER BY log_id DESC LIMIT 1`, [decision, sid]);
    }
    res.json({ ok: true, message: 'Student updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/students/:sid', async (req, res) => {
  const sid = parseInt(req.params.sid, 10);
  if (!sid) return res.status(400).json({ error: 'Invalid student ID' });
  try {
    const [existing] = await pool.query('SELECT * FROM student WHERE sid = ?', [sid]);
    if (existing.length === 0) return res.status(404).json({ error: 'Student not found' });
    await pool.query('DELETE FROM student_promotion_log WHERE sid = ?', [sid]);
    await pool.query('DELETE FROM conduct WHERE sid = ?', [sid]);
    await pool.query('DELETE FROM marks WHERE sid = ?', [sid]);
    await pool.query('DELETE FROM ranks WHERE sit = ?', [sid]);
    await pool.query('DELETE FROM student WHERE sid = ?', [sid]);
    res.json({ ok: true, message: 'Student deleted successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/students', async (req, res) => {
  const { firstname, lastname, reg, district, secter, classId, yearId, programId } = req.body || {};

  if (!firstname || !lastname) return res.status(400).json({ error: 'firstname and lastname are required' });
  if (!classId) return res.status(400).json({ error: 'classId is required' });
  if (!yearId) return res.status(400).json({ error: 'yearId is required' });

  try {
    if (reg) {
      const [existing] = await pool.query('SELECT * FROM student WHERE reg = ?', [reg]);
      if (existing.length > 0) return res.status(400).json({ error: `Registration number ${reg} already exists` });
    }

    const [result] = await pool.query(
      `INSERT INTO student (firstname, lastname, reg, district, secter, class, program_id, registed_year, status, decission, trade) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', '', '0')`,
      [String(firstname).trim(), String(lastname).trim(), reg || null, district || null, secter || null, classId, programId || 0, yearId]
    );

    const newStudentId = result.insertId;
    await pool.query(`INSERT INTO student_promotion_log (sid, from_year, to_year, from_class, to_class, decision, program_id) VALUES (?, ?, ?, ?, ?, 'Promoted', ?)`, [newStudentId, yearId, yearId, classId, classId, programId || 0]);
    res.json({ ok: true, sid: newStudentId, message: 'Student added successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Student upload
const upload = multer({ dest: 'uploads/' });

router.post('/students/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { classId, yearId, programId } = req.body;

  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  if (!classId) return res.status(400).json({ success: false, message: 'classId is required' });
  if (!yearId) return res.status(400).json({ success: false, message: 'yearId is required' });

  try {
    const fileExt = path.extname(file.originalname).toLowerCase();
    let students = [];

    if (fileExt === '.csv') {
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path).pipe(csv()).on('data', (data) => rows.push(data)).on('end', resolve).on('error', reject);
      });
      students = rows;
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      students = xlsx.utils.sheet_to_json(worksheet);
    }

    let added = 0;
    let errors = 0;

    for (const student of students) {
      const firstname = student.firstname || student.firstName || student.FirstName;
      const lastname = student.lastname || student.lastName || student.LastName;
      const reg = student.reg || student.registration || student.Registration;
      const district = student.district || student.District;
      const secter = student.secter || student.sector || student.Sector;

      if (!firstname || !lastname) {
        errors++;
        continue;
      }

      try {
        const [result] = await pool.query(
          `INSERT INTO student (firstname, lastname, reg, district, secter, class, program_id, registed_year, status, decission, trade) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', '', '0')`,
          [String(firstname).trim(), String(lastname).trim(), reg || null, district || null, secter || null, classId, programId || 0, yearId]
        );
        await pool.query(`INSERT INTO student_promotion_log (sid, from_year, to_year, from_class, to_class, decision, program_id) VALUES (?, ?, ?, ?, ?, 'Promoted', ?)`, [result.insertId, yearId, yearId, classId, classId, programId || 0]);
        added++;
      } catch (e) {
        errors++;
      }
    }

    fs.unlinkSync(file.path);
    res.json({ success: true, added, errors, message: `${added} students added, ${errors} errors` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CREATE TABLES ============

const createPromotionTable = async () => {
  const createTableSQL = `CREATE TABLE IF NOT EXISTS student_promotion_log (id INT AUTO_INCREMENT PRIMARY KEY, sid INT NOT NULL, total_marks INT NOT NULL, from_class INT NOT NULL, to_class INT NULL, from_year INT NOT NULL, to_year INT NOT NULL, program_id INT NOT NULL, decision VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_sid (sid), INDEX idx_from_year (from_year), INDEX idx_to_year (to_year), INDEX idx_decision (decision))`;
  try {
    await pool.query(createTableSQL);
    console.log('✅ student_promotion_log table ready');
  } catch (e) {
    console.error('Error creating promotion table:', e);
  }
};

const createAssessmentTable = async () => {
  const createTableSQL = `CREATE TABLE IF NOT EXISTS assessment (AssNo INT AUTO_INCREMENT PRIMARY KEY, AssName VARCHAR(255) NOT NULL)`;
  try {
    await pool.query(createTableSQL);
    console.log('✅ assessment table ready');
  } catch (e) {
    console.error('Error creating assessment table:', e);
  }
};

// ============ TIMETABLE RESERVATIONS TABLE ============

const createTimetableReservationsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS timetable_reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day_of_week VARCHAR(20) NOT NULL,
      period_number INT NOT NULL,
      teacher_id INT NULL,
      class_id INT NULL,
      module_id INT NULL,
      reservation_type ENUM('CPD', 'OFF', 'SPECIAL') NOT NULL,
      description VARCHAR(255) NULL,
      term VARCHAR(20) DEFAULT 'Term 1',
      academic_year VARCHAR(20) DEFAULT '2026-2027',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_teacher (teacher_id),
      INDEX idx_day_period (day_of_week, period_number),
      INDEX idx_active (is_active)
    )
  `;
  try {
    await pool.query(createTableSQL);
    console.log('✅ timetable_reservations table ready');
  } catch (e) {
    console.error('Error creating timetable_reservations table:', e);
  }
};

// ============ TIMETABLE WEEK MANAGEMENT ============

const createTimetableWeeksTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS timetable_weeks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      week_number INT NOT NULL,
      term VARCHAR(20) NOT NULL,
      trimester_number INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      academic_year VARCHAR(20) DEFAULT '2026-2027',
      is_active BOOLEAN DEFAULT FALSE,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_week (week_number, term, academic_year),
      INDEX idx_active (is_active),
      INDEX idx_term (term)
    )
  `;
  try {
    await pool.query(createTableSQL);
    console.log('✅ timetable_weeks table ready');
  } catch (e) {
    console.error('Error creating timetable_weeks table:', e);
  }
};

createPromotionTable();
createAssessmentTable();
createTimetableReservationsTable();
createTimetableWeeksTable();

// ============ TIMETABLE MANAGEMENT ENDPOINTS ============

// ============ TIMETABLE PERIOD MANAGEMENT ============

router.get('/timetable-periods', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, period_number, start_time, end_time, label, period_type FROM timetable_periods ORDER BY period_number ASC'
    );
    const periods = rows.map(row => ({
      id: row.id,
      number: row.period_number,
      start: row.start_time,
      end: row.end_time,
      label: row.label || `Period ${row.period_number}`,
      type: row.period_type || 'academic'
    }));
    res.json({ periods });
  } catch (e) {
    console.error('Error fetching periods:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/timetable-periods', async (req, res) => {
  const { periods } = req.body;
  if (!periods || !Array.isArray(periods)) {
    return res.status(400).json({ error: 'Periods array required' });
  }
  try {
    await pool.query('DELETE FROM timetable_periods');
    for (const period of periods) {
      await pool.query(`
        INSERT INTO timetable_periods (period_number, start_time, end_time, label, period_type)
        VALUES (?, ?, ?, ?, ?)
      `, [period.number, period.start, period.end, period.label || `Period ${period.number}`, period.type || 'academic']);
    }
    const [savedRows] = await pool.query(
      'SELECT id, period_number, start_time, end_time, label, period_type FROM timetable_periods ORDER BY period_number ASC'
    );
    const savedPeriods = savedRows.map(row => ({
      id: row.id,
      number: row.period_number,
      start: row.start_time,
      end: row.end_time,
      label: row.label || `Period ${row.period_number}`,
      type: row.period_type || 'academic'
    }));
    res.json({ success: true, periods: savedPeriods });
  } catch (e) {
    console.error('Error saving periods:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/timetable-periods', async (req, res) => {
  const { periods } = req.body;
  if (!periods || !Array.isArray(periods)) {
    return res.status(400).json({ error: 'Periods array required' });
  }
  try {
    await pool.query('DELETE FROM timetable_periods');
    for (const period of periods) {
      await pool.query(`
        INSERT INTO timetable_periods (period_number, start_time, end_time, label, period_type)
        VALUES (?, ?, ?, ?, ?)
      `, [period.number, period.start, period.end, period.label || `Period ${period.number}`, period.type || 'academic']);
    }
    const [savedRows] = await pool.query(
      'SELECT id, period_number, start_time, end_time, label, period_type FROM timetable_periods ORDER BY period_number ASC'
    );
    const savedPeriods = savedRows.map(row => ({
      id: row.id,
      number: row.period_number,
      start: row.start_time,
      end: row.end_time,
      label: row.label || `Period ${row.period_number}`,
      type: row.period_type || 'academic'
    }));
    res.json({ success: true, periods: savedPeriods });
  } catch (e) {
    console.error('Error updating periods:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE BREAK MANAGEMENT ============

router.get('/timetable-breaks', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, break_name, start_time, end_time, day_of_week FROM timetable_breaks ORDER BY break_order ASC'
    );
    res.json({ breaks: rows });
  } catch (e) {
    console.error('Error fetching breaks:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/timetable-breaks', async (req, res) => {
  const { breaks } = req.body;
  if (!breaks || !Array.isArray(breaks)) {
    return res.status(400).json({ error: 'Breaks array required' });
  }
  try {
    await pool.query('DELETE FROM timetable_breaks');
    for (let i = 0; i < breaks.length; i++) {
      const breakItem = breaks[i];
      await pool.query(`
        INSERT INTO timetable_breaks (break_name, start_time, end_time, day_of_week, break_order)
        VALUES (?, ?, ?, ?, ?)
      `, [breakItem.name, breakItem.start, breakItem.end, breakItem.day || 'All', i]);
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Error saving breaks:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE LUNCH MANAGEMENT ============

router.get('/timetable-lunch', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, start_time, end_time FROM timetable_lunch LIMIT 1'
    );
    res.json({ lunch: rows[0] || null });
  } catch (e) {
    console.error('Error fetching lunch:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/timetable-lunch', async (req, res) => {
  const { start, end } = req.body;
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end time required' });
  }
  try {
    await pool.query('DELETE FROM timetable_lunch');
    await pool.query(`
      INSERT INTO timetable_lunch (start_time, end_time)
      VALUES (?, ?)
    `, [start, end]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error saving lunch time:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE SETTINGS (Combined) ============

router.get('/timetable-settings', async (_req, res) => {
  try {
    const [periods] = await pool.query(
      'SELECT id, period_number, start_time, end_time, label, period_type FROM timetable_periods ORDER BY period_number ASC'
    );
    const [breaks] = await pool.query(
      'SELECT id, break_name, start_time, end_time, day_of_week FROM timetable_breaks ORDER BY break_order ASC'
    );
    const [lunch] = await pool.query(
      'SELECT id, start_time, end_time FROM timetable_lunch LIMIT 1'
    );
    const periodData = periods.map(p => ({
      id: p.id,
      number: p.period_number,
      start: p.start_time,
      end: p.end_time,
      label: p.label || `Period ${p.period_number}`,
      type: p.period_type || 'academic'
    }));
    res.json({
      periods: periodData,
      breaks: breaks.map(b => ({
        id: b.id,
        name: b.break_name,
        start: b.start_time,
        end: b.end_time,
        day: b.day_of_week || 'All'
      })),
      lunch: lunch[0] ? {
        id: lunch[0].id,
        start: lunch[0].start_time,
        end: lunch[0].end_time
      } : null
    });
  } catch (e) {
    console.error('Error fetching timetable settings:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TEACHER WORKLOAD MANAGEMENT ============

router.get('/teacher-workload', async (_req, res) => {
  try {
    const [workload] = await pool.query(`
      SELECT 
        tw.id,
        tw.teacher_id,
        t.fname,
        t.lname,
        t.tcode,
        tw.class_id,
        c.level,
        c.class_name,
        tw.module_id,
        m.mname,
        m.mcode,
        tw.periods_per_week,
        tw.periods_per_day,
        tw.is_active
      FROM teacher_workload tw
      INNER JOIN teacher t ON tw.teacher_id = t.tid
      LEFT JOIN class c ON tw.class_id = c.cid
      LEFT JOIN module m ON tw.module_id = m.moid
      ORDER BY t.fname, t.lname, c.level, c.class_name
    `);
    res.json({ workload });
  } catch (e) {
    console.error('Error fetching teacher workload:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/teacher-workload/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID required' });
  }
  try {
    const [workload] = await pool.query(`
      SELECT 
        tw.id,
        tw.teacher_id,
        t.fname,
        t.lname,
        t.tcode,
        tw.class_id,
        c.level,
        c.class_name,
        tw.module_id,
        m.mname,
        m.mcode,
        tw.periods_per_week,
        tw.periods_per_day,
        tw.is_active
      FROM teacher_workload tw
      INNER JOIN teacher t ON tw.teacher_id = t.tid
      LEFT JOIN class c ON tw.class_id = c.cid
      LEFT JOIN module m ON tw.module_id = m.moid
      WHERE tw.teacher_id = ?
      ORDER BY c.level, c.class_name, m.mname
    `, [teacherId]);
    const [teacher] = await pool.query(
      'SELECT tid, fname, lname, tcode FROM teacher WHERE tid = ?',
      [teacherId]
    );
    res.json({ 
      teacher: teacher[0] || null,
      workload 
    });
  } catch (e) {
    console.error('Error fetching teacher workload:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher-workload', async (req, res) => {
  const { 
    teacher_id, 
    class_id, 
    module_id, 
    periods_per_week, 
    periods_per_day,
    is_active 
  } = req.body;

  if (!teacher_id || !class_id || !module_id) {
    return res.status(400).json({ error: 'teacher_id, class_id, and module_id required' });
  }

  if (periods_per_week === undefined || periods_per_week < 0) {
    return res.status(400).json({ error: 'periods_per_week must be a positive number' });
  }

  try {
    const [existing] = await pool.query(`
      SELECT id FROM teacher_workload 
      WHERE teacher_id = ? AND class_id = ? AND module_id = ?
    `, [teacher_id, class_id, module_id]);

    let result;
    if (existing.length > 0) {
      [result] = await pool.query(`
        UPDATE teacher_workload 
        SET periods_per_week = ?, periods_per_day = ?, is_active = ?
        WHERE teacher_id = ? AND class_id = ? AND module_id = ?
      `, [periods_per_week, periods_per_day || 0, is_active !== undefined ? is_active : 1, teacher_id, class_id, module_id]);
      res.json({ 
        success: true, 
        message: 'Workload updated successfully',
        id: existing[0].id
      });
    } else {
      [result] = await pool.query(`
        INSERT INTO teacher_workload 
        (teacher_id, class_id, module_id, periods_per_week, periods_per_day, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [teacher_id, class_id, module_id, periods_per_week, periods_per_day || 0, is_active !== undefined ? is_active : 1]);
      res.json({ 
        success: true, 
        message: 'Workload added successfully',
        id: result.insertId
      });
    }
  } catch (e) {
    console.error('Error saving teacher workload:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/teacher-workload/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    return res.status(400).json({ error: 'Workload ID required' });
  }
  try {
    const [result] = await pool.query('DELETE FROM teacher_workload WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workload not found' });
    }
    res.json({ success: true, message: 'Workload deleted successfully' });
  } catch (e) {
    console.error('Error deleting teacher workload:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/teacher-workload-summary/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID required' });
  }
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(DISTINCT class_id) as total_classes,
        COUNT(DISTINCT module_id) as total_modules,
        SUM(periods_per_week) as total_periods_per_week,
        MAX(periods_per_day) as max_periods_per_day
      FROM teacher_workload
      WHERE teacher_id = ? AND is_active = 1
    `, [teacherId]);
    const [classDetails] = await pool.query(`
      SELECT 
        c.level,
        c.class_name,
        COUNT(DISTINCT tw.module_id) as modules,
        SUM(tw.periods_per_week) as periods_per_week
      FROM teacher_workload tw
      INNER JOIN class c ON tw.class_id = c.cid
      WHERE tw.teacher_id = ? AND tw.is_active = 1
      GROUP BY c.cid, c.level, c.class_name
      ORDER BY c.level, c.class_name
    `, [teacherId]);
    res.json({
      summary: summary[0] || { total_classes: 0, total_modules: 0, total_periods_per_week: 0, max_periods_per_day: 0 },
      classDetails
    });
  } catch (e) {
    console.error('Error fetching teacher workload summary:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE ASSIGNMENT ENDPOINTS ============

router.post('/timetable-assignment', async (req, res) => {
  const { teacher_id, class_id, module_id, day_of_week, period, room, term, academic_year } = req.body;

  if (!teacher_id || !class_id || !module_id || !day_of_week || !period) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (day_of_week === 'Friday' && (parseInt(period) === 13 || parseInt(period) === 14)) {
      return res.status(400).json({ error: 'Periods 13 and 14 on Friday are reserved for CPD activities' });
    }

    const [offReservations] = await pool.query(`
      SELECT * FROM timetable_reservations 
      WHERE teacher_id = ? AND day_of_week = ? AND period_number = ? 
      AND reservation_type = 'OFF' AND is_active = 1
      AND term = ? AND academic_year = ?
    `, [teacher_id, day_of_week, period, term || 'Term 1', academic_year || '2026-2027']);

    if (offReservations.length > 0) {
      return res.status(400).json({ error: 'This teacher is OFF during this period' });
    }

    const [conflicts] = await pool.query(`
      SELECT * FROM teacher_timetable 
      WHERE teacher_id = ? AND day_of_week = ? AND period = ?
      AND (class_id != ? OR module_id != ?)
    `, [teacher_id, day_of_week, period, class_id, module_id]);

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Conflict: Teacher already has another class at this time',
        conflicts
      });
    }

    const [reservations] = await pool.query(`
      SELECT * FROM timetable_reservations 
      WHERE day_of_week = ? AND period_number = ? AND term = ? AND academic_year = ? AND is_active = 1
    `, [day_of_week, period, term || 'Term 1', academic_year || '2026-2027']);

    if (reservations.length > 0) {
      const reservation = reservations[0];
      if (reservation.reservation_type === 'CPD') {
        return res.status(400).json({ error: 'This period is reserved for CPD activities' });
      }
      if (reservation.reservation_type === 'OFF' && reservation.teacher_id === teacher_id) {
        return res.status(400).json({ error: 'This teacher is off duty during this period' });
      }
    }

    const [result] = await pool.query(`
      INSERT INTO teacher_timetable 
      (teacher_id, class_id, module_id, day_of_week, period, room, term, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [teacher_id, class_id, module_id, day_of_week, period, room || '', term || 'Term 1', academic_year || '2026-2027']);

    res.json({ success: true, id: result.insertId });
  } catch (e) {
    console.error('Error in timetable-assignment:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/timetable-assignment/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { teacher_id, class_id, module_id, day_of_week, period, room, term, academic_year } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Assignment ID required' });
  }

  try {
    if (day_of_week === 'Friday' && (parseInt(period) === 13 || parseInt(period) === 14)) {
      return res.status(400).json({ error: 'Periods 13 and 14 on Friday are reserved for CPD activities' });
    }

    const [offReservations] = await pool.query(`
      SELECT * FROM timetable_reservations 
      WHERE teacher_id = ? AND day_of_week = ? AND period_number = ? 
      AND reservation_type = 'OFF' AND is_active = 1
      AND term = ? AND academic_year = ?
    `, [teacher_id, day_of_week, period, term || 'Term 1', academic_year || '2026-2027']);

    if (offReservations.length > 0) {
      return res.status(400).json({ error: 'This teacher is OFF during this period' });
    }

    const [conflicts] = await pool.query(`
      SELECT * FROM teacher_timetable 
      WHERE teacher_id = ? AND day_of_week = ? AND period = ?
      AND id != ?
    `, [teacher_id, day_of_week, period, id]);

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Conflict: Teacher already has another class at this time',
        conflicts
      });
    }

    await pool.query(`
      UPDATE teacher_timetable 
      SET teacher_id = ?, class_id = ?, module_id = ?, day_of_week = ?, period = ?, 
          room = ?, term = ?, academic_year = ?
      WHERE id = ?
    `, [teacher_id, class_id, module_id, day_of_week, period, room || '', term || 'Term 1', academic_year || '2026-2027', id]);

    res.json({ success: true });
  } catch (e) {
    console.error('Error updating timetable-assignment:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/timetable-assignment/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    return res.status(400).json({ error: 'Assignment ID required' });
  }
  try {
    await pool.query('DELETE FROM teacher_timetable WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting timetable-assignment:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE RESERVATIONS ENDPOINTS ============

router.get('/timetable-reservations', async (req, res) => {
  const { term, academic_year } = req.query;
  try {
    let query = `
      SELECT 
        tr.*,
        t.fname as teacher_fname,
        t.lname as teacher_lname,
        t.tcode as teacher_code,
        c.level as class_level,
        c.class_name as class_name
      FROM timetable_reservations tr
      LEFT JOIN teacher t ON tr.teacher_id = t.tid
      LEFT JOIN class c ON tr.class_id = c.cid
      WHERE tr.term = ? AND tr.academic_year = ?
      ORDER BY tr.day_of_week, tr.period_number
    `;
    const [rows] = await pool.query(query, [term || 'Term 1', academic_year || '2026-2027']);
    res.json({ reservations: rows });
  } catch (e) {
    console.error('Error fetching reservations:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/timetable-reservations', async (req, res) => {
  try {
    const { 
      day_of_week, period_number, teacher_id, class_id, module_id,
      reservation_type, description, term, academic_year, is_active 
    } = req.body;

    if (!day_of_week || !period_number || !reservation_type) {
      return res.status(400).json({ 
        error: 'day_of_week, period_number, and reservation_type required',
        received: { day_of_week, period_number, reservation_type }
      });
    }

    if (reservation_type === 'CPD') {
      if (day_of_week !== 'Friday') {
        return res.status(400).json({ error: 'CPD reservations are only allowed on Friday' });
      }
      if (parseInt(period_number) !== 13 && parseInt(period_number) !== 14) {
        return res.status(400).json({ error: 'CPD reservations are only for periods 13 and 14' });
      }
    }

    if (reservation_type === 'OFF' && !teacher_id) {
      return res.status(400).json({ error: 'Teacher ID is required for OFF reservations' });
    }

    const termValue = term || 'Term 1';
    const academicYearValue = academic_year || '2026-2027';

    const [existing] = await pool.query(
      `SELECT id FROM timetable_reservations 
       WHERE day_of_week = ? AND period_number = ? AND term = ? AND academic_year = ?`,
      [day_of_week, period_number, termValue, academicYearValue]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE timetable_reservations 
         SET teacher_id = ?, class_id = ?, module_id = ?, 
             reservation_type = ?, description = ?, is_active = ?
         WHERE id = ?`,
        [teacher_id || null, class_id || null, module_id || null,
         reservation_type, description || null, is_active !== undefined ? is_active : 1,
         existing[0].id]
      );
      res.json({ success: true, message: 'Reservation updated successfully', id: existing[0].id });
    } else {
      const [result] = await pool.query(
        `INSERT INTO timetable_reservations 
         (day_of_week, period_number, teacher_id, class_id, module_id,
          reservation_type, description, term, academic_year, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [day_of_week, period_number, teacher_id || null, class_id || null, module_id || null,
         reservation_type, description || null, termValue, academicYearValue,
         is_active !== undefined ? is_active : 1]
      );
      res.json({ success: true, message: 'Reservation created successfully', id: result.insertId });
    }
  } catch (e) {
    console.error('Error saving reservation:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/timetable-reservations/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Reservation ID required' });

  try {
    const [result] = await pool.query('DELETE FROM timetable_reservations WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (e) {
    console.error('Error deleting reservation:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ TIMETABLE WEEK MANAGEMENT ENDPOINTS ============

router.get('/timetable-weeks', async (req, res) => {
  const { academic_year } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM timetable_weeks WHERE academic_year = ? ORDER BY term, week_number',
      [academic_year || '2026-2027']
    );
    res.json({ weeks: rows });
  } catch (e) {
    console.error('Error fetching weeks:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/timetable-weeks/active', async (req, res) => {
  const { academic_year } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM timetable_weeks WHERE is_active = 1 AND academic_year = ? LIMIT 1',
      [academic_year || '2026-2027']
    );
    res.json({ activeWeek: rows[0] || null });
  } catch (e) {
    console.error('Error fetching active week:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/timetable-weeks', async (req, res) => {
  const { 
    week_number, term, trimester_number, start_date, end_date, 
    academic_year, is_active, description 
  } = req.body;

  if (!week_number || !term || !trimester_number || !start_date || !end_date) {
    return res.status(400).json({ error: 'week_number, term, trimester_number, start_date, and end_date required' });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM timetable_weeks 
       WHERE week_number = ? AND term = ? AND academic_year = ?`,
      [week_number, term, academic_year || '2026-2027']
    );

    if (is_active) {
      await pool.query(
        'UPDATE timetable_weeks SET is_active = 0 WHERE academic_year = ? AND term = ?',
        [academic_year || '2026-2027', term]
      );
    }

    if (existing.length > 0) {
      await pool.query(
        `UPDATE timetable_weeks 
         SET trimester_number = ?, start_date = ?, end_date = ?, 
             is_active = ?, description = ?
         WHERE id = ?`,
        [trimester_number, start_date, end_date, is_active || 0, description || null, existing[0].id]
      );
      res.json({ success: true, message: 'Week updated successfully', id: existing[0].id });
    } else {
      const [result] = await pool.query(
        `INSERT INTO timetable_weeks 
         (week_number, term, trimester_number, start_date, end_date, 
          academic_year, is_active, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [week_number, term, trimester_number, start_date, end_date,
         academic_year || '2026-2027', is_active || 0, description || null]
      );
      res.json({ success: true, message: 'Week created successfully', id: result.insertId });
    }
  } catch (e) {
    console.error('Error saving week:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/timetable-weeks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Week ID required' });

  try {
    const [result] = await pool.query('DELETE FROM timetable_weeks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Week not found' });
    }
    res.json({ success: true, message: 'Week deleted successfully' });
  } catch (e) {
    console.error('Error deleting week:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ GENERATE DEFAULT WEEKS ============

router.post('/timetable-weeks/generate-default', async (req, res) => {
  const { academic_year } = req.body;
  const year = academic_year || '2026-2027';

  try {
    await pool.query('DELETE FROM timetable_weeks WHERE academic_year = ?', [year]);

    const trimesters = [
      { number: 1, weeks: 15, startDate: new Date('2026-01-26') },
      { number: 2, weeks: 13, startDate: new Date('2026-05-11') },
      { number: 3, weeks: 11, startDate: new Date('2026-08-10') }
    ];

    const terms = ['Term 1', 'Term 2', 'Term 3'];
    let inserted = 0;

    for (const trimester of trimesters) {
      const startDate = new Date(trimester.startDate);
      const term = terms[trimester.number - 1];

      for (let week = 1; week <= trimester.weeks; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const isActive = (trimester.number === 1 && week === 1) || 
                        (trimester.number === 2 && week === 1) || 
                        (trimester.number === 3 && week === 1);

        await pool.query(
          `INSERT INTO timetable_weeks 
           (week_number, term, trimester_number, start_date, end_date, academic_year, is_active, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [week, term, trimester.number, 
           weekStart.toISOString().split('T')[0], 
           weekEnd.toISOString().split('T')[0],
           year, isActive ? 1 : 0,
           `Week ${week} - ${term} (Trimester ${trimester.number})`]
        );
        inserted++;
      }
    }

    res.json({ 
      success: true, 
      message: `${inserted} weeks generated successfully for ${year}`,
      total: inserted
    });
  } catch (e) {
    console.error('Error generating weeks:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ GET TEACHER TIMETABLE ============

router.get('/teacher-timetable/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID required' });
  }

  try {
    const [teacher] = await pool.query(
      'SELECT tid, fname, lname, tcode FROM teacher WHERE tid = ?',
      [teacherId]
    );

    if (teacher.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const [timetable] = await pool.query(`
      SELECT 
        tt.*,
        m.mname,
        m.mcode,
        c.level,
        c.class_name,
        c.class_code
      FROM teacher_timetable tt
      INNER JOIN module m ON tt.module_id = m.moid
      INNER JOIN class c ON tt.class_id = c.cid
      WHERE tt.teacher_id = ?
      ORDER BY tt.day_of_week, tt.period
    `, [teacherId]);

    const [offReservations] = await pool.query(`
      SELECT 
        tr.day_of_week,
        tr.period_number,
        tr.reservation_type,
        tr.description
      FROM timetable_reservations tr
      WHERE tr.teacher_id = ? 
        AND tr.reservation_type = 'OFF' 
        AND tr.is_active = 1
        AND tr.term = 'Term 1' 
        AND tr.academic_year = '2026-2027'
    `, [teacherId]);

    const [periods] = await pool.query(
      'SELECT period_number FROM timetable_periods ORDER BY period_number ASC'
    );
    const periodNumbers = periods.map(p => p.period_number);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const timetableGrid = {};
    days.forEach(day => {
      timetableGrid[day] = {};
      periodNumbers.forEach(period => {
        const isOff = offReservations.some(r => 
          r.day_of_week === day && 
          r.period_number === period
        );

        if (isOff) {
          timetableGrid[day][period] = {
            isOff: true,
            type: 'OFF',
            description: offReservations.find(r => r.day_of_week === day && r.period_number === period)?.description || 'Teacher Off'
          };
        } else {
          const entry = timetable.find(t => t.day_of_week === day && t.period === period);
          if (entry) {
            timetableGrid[day][period] = {
              id: entry.id,
              moduleCode: entry.mcode,
              moduleName: entry.mname,
              className: entry.class_name,
              level: entry.level,
              classCode: entry.class_code,
              classId: entry.class_id,
              moduleId: entry.module_id,
              room: entry.room || '',
              teacherId: entry.teacher_id,
              isOff: false
            };
          } else {
            timetableGrid[day][period] = null;
          }
        }
      });
    });

    res.json({
      teacher: teacher[0],
      days: days,
      periods: periodNumbers,
      timetable: timetableGrid,
      entries: timetable,
      offReservations: offReservations
    });

  } catch (e) {
    console.error('Error in teacher-timetable:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ GET CLASS TIMETABLE ============

router.get('/class-timetable/:classId', async (req, res) => {
  const classId = parseInt(req.params.classId, 10);

  if (!classId) {
    return res.status(400).json({ error: 'Class ID required' });
  }

  try {
    const [classInfo] = await pool.query(
      'SELECT cid, level, class_name, class_code FROM class WHERE cid = ?',
      [classId]
    );

    if (classInfo.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const [timetable] = await pool.query(`
      SELECT 
        tt.*,
        m.mname,
        m.mcode,
        t.fname,
        t.lname,
        t.tcode
      FROM teacher_timetable tt
      INNER JOIN module m ON tt.module_id = m.moid
      INNER JOIN teacher t ON tt.teacher_id = t.tid
      WHERE tt.class_id = ?
      ORDER BY tt.day_of_week, tt.period
    `, [classId]);

    const [periods] = await pool.query(
      'SELECT period_number FROM timetable_periods ORDER BY period_number ASC'
    );
    const periodNumbers = periods.map(p => p.period_number);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const timetableGrid = {};
    days.forEach(day => {
      timetableGrid[day] = {};
      periodNumbers.forEach(period => {
        const entry = timetable.find(t => t.day_of_week === day && t.period === period);
        if (entry) {
          timetableGrid[day][period] = {
            id: entry.id,
            moduleCode: entry.mcode,
            moduleName: entry.mname,
            teacherName: `${entry.fname} ${entry.lname}`,
            teacherCode: entry.tcode,
            teacherId: entry.teacher_id,
            moduleId: entry.module_id,
            room: entry.room || ''
          };
        } else {
          timetableGrid[day][period] = null;
        }
      });
    });

    res.json({
      classInfo: classInfo[0],
      days: days,
      periods: periodNumbers,
      timetable: timetableGrid,
      entries: timetable
    });

  } catch (e) {
    console.error('Error in class-timetable:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ GET TEACHERS AND CLASSES FOR TIMETABLE ============

router.get('/timetable-teachers', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT tid, fname, lname, tcode FROM teacher ORDER BY fname, lname'
    );
    res.json({ teachers: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/timetable-classes', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT cid, level, class_name, class_code FROM class ORDER BY level, class_name'
    );
    res.json({ classes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ AUTO-GENERATE TIMETABLE ============

function getAvailablePeriods(periods, breaks, lunch, day, usedPeriods, teacherPeriodTracker, classId, teacherId, moduleId, reservations) {
  const available = [];

  for (const period of periods) {
    const periodStart = period.start_time;

    if (usedPeriods[day] && usedPeriods[day].includes(period.period_number)) {
      continue;
    }

    let isBreak = false;
    for (const breakItem of breaks) {
      if (breakItem.day_of_week !== 'All' && breakItem.day_of_week !== day) continue;
      if (periodStart >= breakItem.start_time && periodStart < breakItem.end_time) {
        isBreak = true;
        break;
      }
    }

    let isLunch = false;
    if (lunch) {
      if (periodStart >= lunch.start_time && periodStart < lunch.end_time) {
        isLunch = true;
      }
    }

    if (isBreak || isLunch) continue;

    let isReserved = false;
    if (reservations) {
      const reservation = reservations.find(r => 
        r.day_of_week === day && 
        r.period_number === period.period_number
      );
      if (reservation) {
        if (reservation.reservation_type === 'CPD') {
          isReserved = true;
        }
        if (reservation.reservation_type === 'OFF' && reservation.teacher_id === teacherId) {
          isReserved = true;
        }
        if (reservation.class_id === classId && reservation.reservation_type === 'SPECIAL') {
          isReserved = true;
        }
      }
    }

    if (isReserved) continue;

    const moduleDayKey = `${moduleId}_${day}`;
    if (teacherPeriodTracker && teacherPeriodTracker[moduleDayKey] && teacherPeriodTracker[moduleDayKey] >= 3) {
      continue;
    }

    available.push(period.period_number);
  }

  return available;
}

router.post('/auto-generate-timetable', async (req, res) => {
  const { academic_year, term } = req.body;

  try {
    const [workloads] = await pool.query(`
      SELECT 
        tw.*,
        t.fname,
        t.lname,
        t.tcode,
        c.level,
        c.class_name,
        m.mname,
        m.mcode
      FROM teacher_workload tw
      INNER JOIN teacher t ON tw.teacher_id = t.tid
      INNER JOIN class c ON tw.class_id = c.cid
      INNER JOIN module m ON tw.module_id = m.moid
      WHERE tw.is_active = 1
      ORDER BY tw.teacher_id
    `);

    if (workloads.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No workload assignments found. Please configure workload first.' 
      });
    }

    const [periods] = await pool.query(
      'SELECT period_number, start_time, end_time FROM timetable_periods ORDER BY period_number ASC'
    );

    if (periods.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No periods configured. Please configure periods first.' 
      });
    }

    const [breaks] = await pool.query(
      'SELECT start_time, end_time, day_of_week FROM timetable_breaks'
    );

    const [lunch] = await pool.query(
      'SELECT start_time, end_time FROM timetable_lunch LIMIT 1'
    );

    const lunchTime = lunch[0] || null;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const [reservations] = await pool.query(
      `SELECT day_of_week, period_number, reservation_type, teacher_id, class_id 
       FROM timetable_reservations 
       WHERE term = ? AND academic_year = ? AND is_active = 1`,
      [term || 'Term 1', academic_year || '2026-2027']
    );

    const [activeWeekResult] = await pool.query(
      'SELECT * FROM timetable_weeks WHERE is_active = 1 AND academic_year = ? LIMIT 1',
      [academic_year || '2026-2027']
    );
    const activeWeek = activeWeekResult[0] || null;

    const teacherWorkloads = {};
    workloads.forEach(w => {
      if (!teacherWorkloads[w.teacher_id]) {
        teacherWorkloads[w.teacher_id] = {
          teacher: {
            id: w.teacher_id,
            name: `${w.fname} ${w.lname}`,
            code: w.tcode
          },
          assignments: []
        };
      }
      teacherWorkloads[w.teacher_id].assignments.push({
        class_id: w.class_id,
        class_name: `${w.level}${w.class_name}`,
        module_id: w.module_id,
        module_code: w.mcode,
        module_name: w.mname,
        periods_per_week: w.periods_per_week,
        periods_per_day: w.periods_per_day || 3
      });
    });

    await pool.query(
      'DELETE FROM teacher_timetable WHERE term = ? AND academic_year = ?',
      [term || 'Term 1', academic_year || '2026-2027']
    );

    let totalAssigned = 0;
    let totalSkipped = 0;
    const assignmentLog = [];

    for (const [teacherId, data] of Object.entries(teacherWorkloads)) {
      const teacherAssignments = data.assignments;
      const teacherName = data.teacher.name;

      const usedPeriods = {};
      days.forEach(day => {
        usedPeriods[day] = [];
      });

      const teacherPeriodTracker = {};

      for (const assignment of teacherAssignments) {
        const periodsNeeded = assignment.periods_per_week;
        const maxPeriodsPerDay = assignment.periods_per_day || 3;
        let assigned = 0;
        let attempts = 0;
        const maxAttempts = 100;

        let shuffledDays = [...days];
        for (let i = shuffledDays.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledDays[i], shuffledDays[j]] = [shuffledDays[j], shuffledDays[i]];
        }

        const maxPossiblePerDay = Math.min(maxPeriodsPerDay, 3);

        for (const day of shuffledDays) {
          if (assigned >= periodsNeeded) break;
          if (attempts > maxAttempts) break;

          const moduleDayKey = `${assignment.module_id}_${day}`;
          if (!teacherPeriodTracker[moduleDayKey]) {
            teacherPeriodTracker[moduleDayKey] = 0;
          }

          if (teacherPeriodTracker[moduleDayKey] >= maxPossiblePerDay) {
            continue;
          }

          const availablePeriods = getAvailablePeriods(
            periods,
            breaks,
            lunchTime,
            day,
            usedPeriods,
            teacherPeriodTracker,
            assignment.class_id,
            teacherId,
            assignment.module_id,
            reservations
          );

          if (availablePeriods.length === 0) continue;

          for (const period of availablePeriods) {
            if (assigned >= periodsNeeded) break;
            if (teacherPeriodTracker[moduleDayKey] >= maxPossiblePerDay) break;

            if (day === 'Friday' && (period === 13 || period === 14)) {
              continue;
            }

            const [classConflict] = await pool.query(
              `SELECT id FROM teacher_timetable 
               WHERE class_id = ? AND day_of_week = ? AND period = ? 
               AND term = ? AND academic_year = ?`,
              [assignment.class_id, day, period, term || 'Term 1', academic_year || '2026-2027']
            );

            if (classConflict.length === 0) {
              usedPeriods[day].push(period);
              teacherPeriodTracker[moduleDayKey] = (teacherPeriodTracker[moduleDayKey] || 0) + 1;

              await pool.query(`
                INSERT INTO teacher_timetable 
                (teacher_id, class_id, module_id, day_of_week, period, room, term, academic_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                teacherId,
                assignment.class_id,
                assignment.module_id,
                day,
                period,
                '',
                term || 'Term 1',
                academic_year || '2026-2027'
              ]);

              assigned++;
              totalAssigned++;
            }
          }
          attempts++;
        }

        if (assigned < periodsNeeded) {
          totalSkipped++;
          assignmentLog.push({
            teacher: teacherName,
            module: assignment.module_name,
            class: assignment.class_name,
            needed: periodsNeeded,
            assigned: assigned,
            status: assigned > 0 ? 'partial' : 'failed',
            reason: assigned === 0 ? 'No available slots found' : 'Could not assign all periods'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Timetable generated successfully! ${totalAssigned} periods assigned.`,
      stats: {
        totalAssigned,
        totalSkipped,
        teachersProcessed: Object.keys(teacherWorkloads).length,
        activeWeek: activeWeek ? `Week ${activeWeek.week_number} - ${activeWeek.term}` : 'No active week'
      },
      assignmentLog
    });

  } catch (e) {
    console.error('Error auto-generating timetable:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ CHECK TEACHER AVAILABILITY ============

router.get('/check-teacher-availability/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const { day, period, term, academic_year } = req.query;

  try {
    const [existing] = await pool.query(
      `SELECT * FROM teacher_timetable 
       WHERE teacher_id = ? AND day_of_week = ? AND period = ?
       AND term = ? AND academic_year = ?`,
      [teacherId, day, period, term || 'Term 1', academic_year || '2026-2027']
    );

    if (existing.length > 0) {
      return res.json({ available: false, reason: 'Already assigned' });
    }

    const [reservations] = await pool.query(
      `SELECT * FROM timetable_reservations 
       WHERE day_of_week = ? AND period_number = ? AND term = ? AND academic_year = ? AND is_active = 1`,
      [day, period, term || 'Term 1', academic_year || '2026-2027']
    );

    if (reservations.length > 0) {
      const reservation = reservations[0];
      if (reservation.reservation_type === 'CPD') {
        return res.json({ available: false, reason: 'Reserved for CPD' });
      }
      if (reservation.reservation_type === 'OFF' && reservation.teacher_id === teacherId) {
        return res.json({ available: false, reason: 'Teacher is off duty' });
      }
      if (reservation.class_id && reservation.reservation_type === 'SPECIAL') {
        return res.json({ available: false, reason: 'Reserved for special activity' });
      }
    }

    res.json({ available: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ TEACHER CONFLICTS ============

router.get('/teacher-conflicts/:teacherId', async (req, res) => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const { term, academic_year } = req.query;

  try {
    const [conflicts] = await pool.query(`
      SELECT 
        tt1.day_of_week,
        tt1.period,
        tt1.class_id,
        c1.class_name as class1_name,
        tt2.class_id as class2_id,
        c2.class_name as class2_name,
        tt1.module_id as module1_id,
        m1.mname as module1_name,
        tt2.module_id as module2_id,
        m2.mname as module2_name
      FROM teacher_timetable tt1
      LEFT JOIN class c1 ON tt1.class_id = c1.cid
      LEFT JOIN module m1 ON tt1.module_id = m1.moid
      INNER JOIN teacher_timetable tt2 
        ON tt1.teacher_id = tt2.teacher_id 
        AND tt1.day_of_week = tt2.day_of_week 
        AND tt1.period = tt2.period 
        AND tt1.id != tt2.id
      LEFT JOIN class c2 ON tt2.class_id = c2.cid
      LEFT JOIN module m2 ON tt2.module_id = m2.moid
      WHERE tt1.teacher_id = ? 
        AND tt1.term = ? 
        AND tt1.academic_year = ?
      GROUP BY tt1.day_of_week, tt1.period
    `, [teacherId, term || 'Term 1', academic_year || '2026-2027']);

    res.json({ conflicts });
  } catch (e) {
    console.error('Error checking conflicts:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// ONLINE CLASSES - SPECIFIC ROUTES FIRST
// ============================================

// Update teacher activity
router.post('/update-activity', async (req, res) => {
  const { tcode } = req.body || {};
  const sessionTcode = req.session?.tcode || tcode;

  if (!sessionTcode) {
    return res.status(400).json({ error: 'tcode required' });
  }

  try {
    await pool.query('UPDATE user SET last_activity = NOW() WHERE tcode = ?', [sessionTcode]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Teacher dashboard
router.get('/dashboard', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;

  try {
    const [teachers] = await pool.query('SELECT * FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const teacher = teachers[0];

    const [[classCount]] = await pool.query(
      'SELECT COUNT(DISTINCT cid) as total FROM permision WHERE tid = ?',
      [teacher.tid]
    );

    const [[moduleCount]] = await pool.query(
      'SELECT COUNT(DISTINCT mid) as total FROM permision WHERE tid = ?',
      [teacher.tid]
    );

    const [[studentCount]] = await pool.query(
      `SELECT COUNT(DISTINCT s.sid) as total 
       FROM student s
       INNER JOIN permision p ON s.class = p.cid
       WHERE p.tid = ? AND s.status = 'Active'`,
      [teacher.tid]
    );

    let onlineCount = { total: 0 };
    try {
      const [[result]] = await pool.query(
        `SELECT COUNT(*) as total FROM online_classes 
         WHERE tid = ? AND status IN ('scheduled', 'ongoing')`,
        [teacher.tid]
      );
      onlineCount = result;
    } catch (err) {
      // Table may not exist yet
    }

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

// My Classes
router.get('/my-classes', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;

  try {
    const [teachers] = await pool.query('SELECT * FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const teacher = teachers[0];

    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.level, c.class_name, c.class_code
       FROM class c
       INNER JOIN permision p ON c.cid = p.cid
       WHERE p.tid = ?
       ORDER BY c.level, c.class_name`,
      [teacher.tid]
    );

    for (const cls of classes) {
      const [modules] = await pool.query(
        `SELECT DISTINCT m.moid, m.mname, m.mcode
         FROM module m
         INNER JOIN permision p ON m.moid = p.mid
         WHERE p.tid = ? AND p.cid = ?
         ORDER BY m.mname`,
        [teacher.tid, cls.cid]
      );
      cls.modules = modules;
    }

    res.json({ classes });
  } catch (e) {
    console.error('My classes error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ SCHEDULE CLASS ============

router.post('/schedule-class', async (req, res) => {
  const tcode = req.session?.tcode || req.body.tcode;

  if (!tcode) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const {
    cid,
    title,
    description,
    meeting_link,
    meeting_id,
    meeting_password,
    scheduled_date,
    start_time,
    end_time,
    duration_minutes
  } = req.body;

  if (!cid || !title || !meeting_link || !scheduled_date || !start_time || !end_time) {
    return res.status(400).json({ 
      error: 'Missing required fields: cid, title, meeting_link, scheduled_date, start_time, end_time' 
    });
  }

  if (!/^https?:\/\/.+/.test(meeting_link)) {
    return res.status(400).json({ error: 'Invalid meeting link URL' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    const tid = teachers[0].tid;

    const [permissions] = await pool.query(
      'SELECT * FROM permision WHERE tid = ? AND cid = ?',
      [tid, cid]
    );
    if (permissions.length === 0) {
      return res.status(403).json({ 
        error: 'You do not have permission to schedule classes for this class' 
      });
    }

    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      duration = Math.round((end - start) / 60000);
    }

    const [result] = await pool.query(
      `INSERT INTO online_classes 
       (cid, tid, title, description, meeting_link, meeting_id, meeting_password, 
        scheduled_date, start_time, end_time, duration_minutes, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        cid, tid, title.trim(), description?.trim() || null,
        meeting_link.trim(), meeting_id?.trim() || null, meeting_password?.trim() || null,
        scheduled_date, start_time, end_time, duration || null
      ]
    );

    res.json({ 
      ok: true, 
      classId: result.insertId,
      message: 'Online class scheduled successfully' 
    });
  } catch (e) {
    console.error('Error scheduling class:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ LIST ALL ONLINE CLASSES ============

router.get('/online-classes', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;

  if (!tcode) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    const tid = teachers[0].tid;

    const [classes] = await pool.query(
      `SELECT 
        oc.*,
        c.class_name,
        c.class_code,
        c.level
       FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid
       WHERE oc.tid = ?
       ORDER BY oc.scheduled_date DESC, oc.start_time DESC`,
      [tid]
    );

    res.json({ classes });
  } catch (e) {
    console.error('Error fetching online classes:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ WAITING ROOM ============

router.get('/online-classes/:id/waiting-room', async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

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
      `UPDATE online_class_waiting_room 
       SET status = 'approved', approved_at = NOW() 
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
    } catch (attErr) {
      console.warn('Attendance insert error:', attErr.message);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('Approve error:', e);
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
      `UPDATE online_class_waiting_room 
       SET status = 'rejected', rejected_at = NOW() 
       WHERE online_class_id = ? AND sid = ?`,
      [classId, sid]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Reject error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ CHAT ============

router.get('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

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
    console.error('Chat fetch error:', e);
    res.json({ messages: [] });
  }
});

router.post('/online-classes/:id/chat', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.body.tcode;
  const { message } = req.body;

  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    await pool.query(
      `INSERT INTO online_class_chat (online_class_id, sender_id, sender_type, message, created_at) 
       VALUES (?, ?, 'teacher', ?, NOW())`,
      [classId, teachers[0].tid, message.trim()]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('Chat send error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ ASSESSMENTS ============

router.get('/online-classes/:id/assessments', async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

  try {
    const [classes] = await pool.query(
      'SELECT cid, tid FROM online_classes WHERE class_id = ?',
      [classId]
    );
    if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });

    const [assessments] = await pool.query(
      `SELECT a.*, 
              (SELECT COUNT(*) FROM assessment_questions 
               WHERE assessment_id = a.assessment_id) as questions_count
       FROM assessments a
       WHERE a.cid = ? AND a.tid = ?
       ORDER BY a.created_at DESC`,
      [classes[0].cid, classes[0].tid]
    );

    res.json({ assessments });
  } catch (e) {
    console.error('Assessments fetch error:', e);
    res.json({ assessments: [] });
  }
});

router.post('/online-classes/:id/send-assessment', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const { assessment_id } = req.body;

  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });
  if (!assessment_id) return res.status(400).json({ error: 'Assessment ID required' });

  try {
    const [classes] = await pool.query(
      'SELECT cid FROM online_classes WHERE class_id = ?',
      [classId]
    );
    if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });

    const [students] = await pool.query(
      `SELECT s.sid FROM student s
       WHERE s.class = ? AND s.status = 'Active'`,
      [classes[0].cid]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'No active students in this class' });
    }

    let assigned = 0;
    for (const student of students) {
      try {
        await pool.query(
          `INSERT INTO assessment_submissions 
           (assessment_id, online_class_id, sid, submission_date, status) 
           VALUES (?, ?, ?, NOW(), 'pending')
           ON DUPLICATE KEY UPDATE 
             online_class_id = VALUES(online_class_id),
             submission_date = VALUES(submission_date)`,
          [assessment_id, classId, student.sid]
        );
        assigned++;
      } catch (insertErr) {
        console.warn(`Could not assign to student ${student.sid}:`, insertErr.message);
      }
    }

    res.json({ ok: true, sent_to: assigned });
  } catch (e) {
    console.error('Send assessment error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ START / END CLASS ============

router.put('/online-classes/:id/start', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.body.tcode;

  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [result] = await pool.query(
      `UPDATE online_classes 
       SET status = 'ongoing' 
       WHERE class_id = ? AND tid = ?`,
      [classId, teachers[0].tid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ ok: true, message: 'Class started' });
  } catch (e) {
    console.error('Start class error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/online-classes/:id/end', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.body.tcode;

  if (!classId) return res.status(400).json({ error: 'Invalid class ID' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [result] = await pool.query(
      `UPDATE online_classes 
       SET status = 'completed' 
       WHERE class_id = ? AND tid = ?`,
      [classId, teachers[0].tid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ ok: true, message: 'Class ended' });
  } catch (e) {
    console.error('End class error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ ATTENDANCE ============

router.get('/online-classes/:id/attendance', async (req, res) => {
  const classId = parseInt(req.params.id, 10);

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

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
    console.error('Attendance fetch error:', e);
    res.json({ attendance: [] });
  }
});

// ============ GET SINGLE CLASS / UPDATE / DELETE ============

router.get('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.query.tcode;

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [classes] = await pool.query(
      `SELECT oc.*, c.class_name, c.class_code, c.level
       FROM online_classes oc
       INNER JOIN class c ON oc.cid = c.cid
       WHERE oc.class_id = ? AND oc.tid = ?`,
      [classId, teachers[0].tid]
    );

    if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: classes[0] });
  } catch (e) {
    console.error('Get single class error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.body.tcode;
  const {
    title,
    description,
    meeting_link,
    meeting_id,
    meeting_password,
    scheduled_date,
    start_time,
    end_time,
    duration_minutes,
    status
  } = req.body;

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      duration = Math.round((end - start) / 60000);
    }

    const [result] = await pool.query(
      `UPDATE online_classes 
       SET title = ?, description = ?, meeting_link = ?, meeting_id = ?, 
           meeting_password = ?, scheduled_date = ?, start_time = ?, end_time = ?, 
           duration_minutes = ?, status = ?
       WHERE class_id = ? AND tid = ?`,
      [
        title?.trim(), description?.trim() || null, meeting_link?.trim(),
        meeting_id?.trim() || null, meeting_password?.trim() || null,
        scheduled_date, start_time, end_time, duration || null,
        status || 'scheduled', classId, teachers[0].tid
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found or no permission' });
    }

    res.json({ ok: true, message: 'Class updated successfully' });
  } catch (e) {
    console.error('Update class error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/online-classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id, 10);
  const tcode = req.session?.tcode || req.query.tcode;

  if (!classId) {
    return res.status(400).json({ error: 'Invalid class ID' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [result] = await pool.query(
      'DELETE FROM online_classes WHERE class_id = ? AND tid = ?',
      [classId, teachers[0].tid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found or no permission' });
    }

    res.json({ ok: true, message: 'Class deleted successfully' });
  } catch (e) {
    console.error('Delete class error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ DEBUG - LIST ALL ROUTES ============

router.get('/debug-routes', (req, res) => {
  const routes = [];
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} /api/teacher${layer.route.path}`);
    }
  });
  res.json({ routes });
});

// ============ ASSESSMENT CREATION ENDPOINTS ============

// Get teacher's permitted classes
router.get('/assessment-classes', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [classes] = await pool.query(
      `SELECT DISTINCT c.cid, c.class_name, c.class_code, c.level
       FROM permision p
       INNER JOIN class c ON p.cid = c.cid
       WHERE p.tid = ?
       ORDER BY c.class_name`,
      [teachers[0].tid]
    );

    res.json({ classes });
  } catch (e) {
    console.error('Assessment classes error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Create assessment (step 1)
router.post('/create-assessment', async (req, res) => {
  const tcode = req.session?.tcode || req.body.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  const {
    cid, title, description, assessment_type,
    total_marks, passing_marks, duration_minutes,
    start_date, start_time, end_date, end_time,
    instructions, allow_late_submission, show_results_immediately
  } = req.body;

  if (!cid || !title || !assessment_type || !total_marks || !passing_marks) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!start_date || !start_time || !end_date || !end_time) {
    return res.status(400).json({ error: 'Start and end date/time are required' });
  }

  const startDt = new Date(`${start_date}T${start_time}`);
  const endDt = new Date(`${end_date}T${end_time}`);
  if (endDt <= startDt) {
    return res.status(400).json({ error: 'End date/time must be after start date/time' });
  }
  if (parseInt(passing_marks) > parseInt(total_marks)) {
    return res.status(400).json({ error: 'Passing marks cannot exceed total marks' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    const [perms] = await pool.query(
      'SELECT gid FROM permision WHERE tid = ? AND cid = ?',
      [tid, cid]
    );
    if (perms.length === 0) {
      return res.status(403).json({ error: 'You do not have permission for this class' });
    }

    const [result] = await pool.query(
      `INSERT INTO assessments 
       (cid, tid, title, description, assessment_type, total_marks, passing_marks,
        duration_minutes, start_date, start_time, end_date, end_time, instructions,
        status, allow_late_submission, show_results_immediately)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        cid, tid, title.trim(),
        description?.trim() || null,
        assessment_type,
        parseInt(total_marks),
        parseInt(passing_marks),
        duration_minutes ? parseInt(duration_minutes) : null,
        start_date, start_time, end_date, end_time,
        instructions?.trim() || null,
        allow_late_submission ? 1 : 0,
        show_results_immediately ? 1 : 0
      ]
    );

    res.json({
      ok: true,
      assessment_id: result.insertId,
      message: 'Assessment created successfully! Now add questions.'
    });
  } catch (e) {
    console.error('Create assessment error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ✅ NEW: Add a single question to an assessment
router.post('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.body.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  const {
    question_type, question_text,
    option_a, option_b, option_c, option_d,
    correct_answer, marks
  } = req.body;

  if (!question_type || !question_text || !marks) {
    return res.status(400).json({ error: 'question_type, question_text, and marks are required' });
  }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    // Verify ownership
    const [a] = await pool.query(
      'SELECT assessment_id FROM assessments WHERE assessment_id = ? AND tid = ?',
      [assessmentId, teachers[0].tid]
    );
    if (a.length === 0) return res.status(404).json({ error: 'Assessment not found or no permission' });

    const [result] = await pool.query(
      `INSERT INTO assessment_questions
       (assessment_id, question_type, question_text, option_a, option_b, option_c, option_d,
        correct_answer, marks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assessmentId, question_type, question_text.trim(),
        option_a?.trim() || null,
        option_b?.trim() || null,
        option_c?.trim() || null,
        option_d?.trim() || null,
        correct_answer?.trim() || null,
        parseInt(marks)
      ]
    );

    res.json({ ok: true, question_id: result.insertId });
  } catch (e) {
    console.error('Add question error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ✅ NEW: Get questions for an assessment
router.get('/assessments/:id/questions', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  try {
    const [rows] = await pool.query(
      `SELECT question_id, question_type, question_text, option_a, option_b, option_c,
              option_d, correct_answer, marks
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY question_id ASC`,
      [assessmentId]
    );
    res.json({ questions: rows });
  } catch (e) {
    console.error('Get questions error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ✅ NEW: Delete a question
router.delete('/assessment-questions/:id', async (req, res) => {
  const qid = parseInt(req.params.id, 10);
  if (!qid) return res.status(400).json({ error: 'Invalid question ID' });
  try {
    const [result] = await pool.query('DELETE FROM assessment_questions WHERE question_id = ?', [qid]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ NEW: Publish assessment (change status from draft to published)
router.put('/assessments/:id/publish', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.body.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM assessment_questions WHERE assessment_id = ?',
      [assessmentId]
    );
    if (total === 0) {
      return res.status(400).json({ error: 'Cannot publish an assessment with no questions' });
    }

    const [result] = await pool.query(
      `UPDATE assessments SET status = 'published'
       WHERE assessment_id = ? AND tid = ?`,
      [assessmentId, teachers[0].tid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Assessment not found' });

    res.json({ ok: true, message: 'Assessment published successfully' });
  } catch (e) {
    console.error('Publish error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ✅ NEW: Get single assessment with its questions (for the "add questions" step)
router.get('/assessments/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.class_name, c.class_code, c.level
       FROM assessments a
       LEFT JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ?`,
      [assessmentId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Assessment not found' });

    const [questions] = await pool.query(
      `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_id ASC`,
      [assessmentId]
    );

    res.json({ assessment: rows[0], questions });
  } catch (e) {
    console.error('Get assessment error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ GRADE SUBMISSIONS ENDPOINTS ============

// Helper: extract a single letter (A/B/C/D) from a stored correct_answer
function extractCorrectLetter(correctAnswer) {
  if (!correctAnswer) return '';
  const str = String(correctAnswer).trim();
  // Match "A." or "A " or "A)"
  const m = str.toUpperCase().match(/^([A-Z])[\.\s\)]/);
  if (m) return m[1];
  // Single letter
  if (str.length === 1 && /^[A-Za-z]$/.test(str)) return str.toUpperCase();
  // True/False
  const tf = str.toLowerCase();
  if (tf === 'true' || tf === 'false') return tf.charAt(0).toUpperCase() + tf.slice(1);
  return str;
}

// Get assessment details + submissions for grading
router.get('/assessments/:id/grade', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    // Assessment info — verify teacher has permission on this class
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name, c.class_code, c.level
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) {
      return res.status(404).json({ error: 'Assessment not found or no permission' });
    }
    const assessment = assessments[0];

    // Questions
    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text,
              option_a, option_b, option_c, option_d, correct_answer, marks
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY question_id ASC`,
      [assessmentId]
    );

    const questionMap = {};
    questions.forEach(q => { questionMap[q.question_id] = q; });

    // Submissions
    const [submissions] = await pool.query(
      `SELECT sub.*, s.firstname, s.lastname, s.reg
       FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid
       WHERE sub.assessment_id = ?
       ORDER BY sub.submission_date ASC`,
      [assessmentId]
    );

    // Process each submission
    const submissionsData = submissions.map(sub => {
      let answers = [];
      try {
        answers = sub.answers ? JSON.parse(sub.answers) : [];
        if (!Array.isArray(answers)) answers = [];
      } catch {
        answers = [];
      }

      let autoScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;

      const processedAnswers = answers.map(answer => {
        const qid = answer.qid;
        const q = questionMap[qid];
        if (!q) return answer;

        const userAnswer = answer.user_answer ?? answer.answer ?? '';
        const userLetter = answer.user_letter ?? '';
        const hasAnswer = userAnswer !== '' && userAnswer !== null && userAnswer !== undefined;

        if (!hasAnswer) unansweredCount++;

        // If correctness already stored, use it
        if (answer.is_correct !== undefined && answer.is_correct !== null) {
          if (answer.is_correct) {
            correctCount++;
            autoScore += answer.obtained ?? q.marks;
          } else if (hasAnswer) {
            wrongCount++;
          }
          return answer;
        }

        // Auto-grade MC/TF
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
          if (isCorrect) {
            correctCount++;
            autoScore += obtained;
          } else if (hasAnswer) {
            wrongCount++;
          }
          return { ...answer, is_correct: isCorrect, obtained };
        }

        // Non-auto questions: just carry existing obtained if any
        if (answer.obtained) autoScore += answer.obtained;
        return answer;
      });

      return {
        submission_id: sub.submission_id,
        sid: sub.sid,
        firstname: sub.firstname,
        lastname: sub.lastname,
        reg: sub.reg,
        submission_date: sub.submission_date,
        answers: processedAnswers,
        obtained_marks: sub.obtained_marks,
        auto_score: autoScore,
        correct_count: correctCount,
        wrong_count: wrongCount,
        unanswered_count: unansweredCount,
        feedback: sub.feedback || '',
        status: sub.status,
        file_path: sub.file_path || null,
      };
    });

    res.json({
      assessment,
      questions,
      submissions: submissionsData,
    });
  } catch (e) {
    console.error('Grade fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Save grades for a single submission
router.post('/submissions/:id/grade', async (req, res) => {
  const submissionId = parseInt(req.params.id, 10);
  if (!submissionId) return res.status(400).json({ error: 'Invalid submission ID' });

  const tcode = req.session?.tcode || req.body.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  const { marks = {}, feedback = '' } = req.body; // marks: { [question_id]: number }

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    // Get submission + assessment
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

    // Load questions for max marks
    const [questions] = await pool.query(
      `SELECT question_id, marks FROM assessment_questions WHERE assessment_id = ?`,
      [sub.assessment_id]
    );
    const qMap = {};
    questions.forEach(q => { qMap[q.question_id] = q; });

    // Parse existing answers
    let answers = [];
    try {
      answers = sub.answers ? JSON.parse(sub.answers) : [];
      if (!Array.isArray(answers)) answers = [];
    } catch {
      answers = [];
    }

    let totalObtained = 0;

    answers = answers.map(answer => {
      const qid = answer.qid;
      const q = qMap[qid];
      if (!q) return answer;

      // Only override if the teacher sent a mark for this question
      if (marks[qid] !== undefined && marks[qid] !== null && marks[qid] !== '') {
        const obtained = parseFloat(marks[qid]);
        const clamped = Math.max(0, Math.min(obtained, q.marks));
        totalObtained += clamped;
        return {
          ...answer,
          obtained: clamped,
          is_correct: clamped >= q.marks * 0.5,
        };
      }

      // Otherwise keep what the auto-grader already computed
      if (answer.obtained !== undefined && answer.obtained !== null) {
        totalObtained += Number(answer.obtained) || 0;
      }
      return answer;
    });

    // Update submission
    await pool.query(
      `UPDATE assessment_submissions
       SET obtained_marks = ?, answers = ?, feedback = ?, status = 'graded',
           graded_by = ?, graded_date = NOW()
       WHERE submission_id = ?`,
      [totalObtained, JSON.stringify(answers), feedback || '', tid, submissionId]
    );

    // Notify student
    const passed = totalObtained >= sub.passing_marks;
    const notifMessage = `Your submission for "${sub.title}" has been graded. Score: ${totalObtained}/${sub.total_marks} - Status: ${passed ? 'PASSED' : 'FAILED'}`;
    try {
      await pool.query(
        `INSERT INTO notifications (sid, title, message, link, created_at)
         VALUES (?, 'Assessment Graded', ?, 'student_results.php', NOW())`,
        [sub.sid, notifMessage]
      );
    } catch (notifErr) {
      console.warn('Notification insert failed:', notifErr.message);
    }

    res.json({
      ok: true,
      obtained_marks: totalObtained,
      passed,
      message: 'Grades saved successfully',
    });
  } catch (e) {
    console.error('Save grade error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ ASSESSMENT REPORTS ENDPOINTS ============

// List classes the teacher has assessments for (or has permission on)
router.get('/report-classes', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    // Classes the teacher has assessments for OR has permission on
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
    console.error('Report classes error:', e);
    res.status(500).json({ error: e.message });
  }
});

// List assessments for a class + teacher
router.get('/report-assessments/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    const [assessments] = await pool.query(
      `SELECT assessment_id, title, assessment_type, total_marks, passing_marks,
              status, created_at
       FROM assessments
       WHERE cid = ? AND tid = ?
       ORDER BY created_at DESC`,
      [cid, tid]
    );

    res.json({ assessments });
  } catch (e) {
    console.error('Report assessments error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Overall class performance (all assessments for a class)
router.get('/report-class-performance/:cid', async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid class ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    const [rows] = await pool.query(
      `SELECT 
         a.assessment_id, a.title, a.assessment_type, a.total_marks, a.passing_marks,
         COUNT(DISTINCT sub.submission_id) as submissions,
         AVG(sub.obtained_marks) as avg_marks,
         MIN(sub.obtained_marks) as min_marks,
         MAX(sub.obtained_marks) as max_marks,
         SUM(CASE WHEN sub.obtained_marks >= a.passing_marks THEN 1 ELSE 0 END) as passed_count
       FROM assessments a
       LEFT JOIN assessment_submissions sub 
         ON a.assessment_id = sub.assessment_id AND sub.status = 'graded'
       WHERE a.cid = ? AND a.tid = ?
       GROUP BY a.assessment_id
       ORDER BY a.created_at DESC`,
      [cid, tid]
    );

    // Normalize nulls
    const performance = rows.map(r => ({
      ...r,
      submissions: Number(r.submissions) || 0,
      avg_marks: r.avg_marks !== null ? Number(r.avg_marks) : 0,
      min_marks: r.min_marks !== null ? Number(r.min_marks) : 0,
      max_marks: r.max_marks !== null ? Number(r.max_marks) : 0,
      passed_count: Number(r.passed_count) || 0,
      passing_rate: r.submissions > 0
        ? Number(((r.passed_count / r.submissions) * 100).toFixed(1))
        : 0,
    }));

    res.json({ performance });
  } catch (e) {
    console.error('Class performance error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Detailed report for a single assessment
router.get('/report-assessment/:id', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    // Assessment info
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) {
      return res.status(404).json({ error: 'Assessment not found or no permission' });
    }
    const assessment = assessments[0];

    // All students in the class + their submission
    const [students] = await pool.query(
      `SELECT 
         s.sid, s.firstname, s.lastname, s.reg,
         sub.submission_id, sub.submission_date, sub.obtained_marks, sub.status, sub.feedback
       FROM student s
       LEFT JOIN assessment_submissions sub 
         ON s.sid = sub.sid AND sub.assessment_id = ?
       WHERE s.class = ?
       ORDER BY s.firstname, s.lastname`,
      [assessmentId, assessment.cid]
    );

    // Compute statistics
    let total_students = 0;
    let submitted_count = 0;
    let graded_count = 0;
    let total_marks_sum = 0;
    let max_marks = 0;
    let min_marks = assessment.total_marks;
    let pass_count = 0;

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

          const percentage = assessment.total_marks > 0
            ? (m / assessment.total_marks) * 100
            : 0;
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
      total_students,
      submitted_count,
      graded_count,
      pending_grading: submitted_count - graded_count,
      not_submitted: total_students - submitted_count,
      average_marks: graded_count > 0 ? Number((total_marks_sum / graded_count).toFixed(2)) : 0,
      max_marks,
      min_marks: min_marks === assessment.total_marks && graded_count === 0 ? 0 : min_marks,
      passing_rate: graded_count > 0 ? Number(((pass_count / graded_count) * 100).toFixed(1)) : 0,
      pass_count,
    };

    // Score distribution buckets
    const distribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    studentsResults.forEach(s => {
      if (s.status === 'graded' && s.percentage !== null) {
        if (s.percentage <= 20) distribution[0]++;
        else if (s.percentage <= 40) distribution[1]++;
        else if (s.percentage <= 60) distribution[2]++;
        else if (s.percentage <= 80) distribution[3]++;
        else distribution[4]++;
      }
    });

    res.json({
      assessment,
      statistics,
      students: studentsResults,
      distribution,
    });
  } catch (e) {
    console.error('Assessment report error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ DOWNLOAD RESPONSES ENDPOINTS ============

// List assessments with submission counts + list of students who submitted
router.get('/download-assessments', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    const [assessments] = await pool.query(
      `SELECT a.assessment_id, a.title, a.total_marks, a.assessment_type, a.created_at,
              c.class_name, c.class_code,
              (SELECT COUNT(*) FROM assessment_questions q
               WHERE q.assessment_id = a.assessment_id) as total_questions,
              (SELECT COUNT(*) FROM assessment_submissions s
               WHERE s.assessment_id = a.assessment_id AND s.status IN ('submitted','graded')) as total_submissions
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.tid = ?
       ORDER BY a.created_at DESC`,
      [tid]
    );

    // For each assessment, fetch the list of students who submitted
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
    console.error('Download assessments error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Build the answer-sheet data for one assessment (all students OR one student)
router.get('/download-answers/:assessmentId', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    // Assessment
    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name
       FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) {
      return res.status(404).json({ error: 'Assessment not found or no permission' });
    }
    const assessment = assessments[0];

    // Questions
    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text,
              option_a, option_b, option_c, option_d, correct_answer, marks
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY question_id ASC`,
      [assessmentId]
    );

    // Submissions
    let submissionsSql = `
      SELECT sub.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
      FROM assessment_submissions sub
      INNER JOIN student s ON sub.sid = s.sid
      WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
    `;
    const params = [assessmentId];
    if (studentId) {
      submissionsSql += ' AND sub.sid = ?';
      params.push(studentId);
    }
    submissionsSql += ' ORDER BY s.lastname, s.firstname';

    const [submissions] = await pool.query(submissionsSql, params);

    // Process each submission: parse answers, compute score, grade
    const processed = submissions.map(sub => {
      let answers = [];
      try {
        answers = sub.answers ? JSON.parse(sub.answers) : [];
        if (!Array.isArray(answers)) answers = [];
      } catch {
        answers = [];
      }

      // Map by question_id for fast lookup
      const answerMap = {};
      answers.forEach(a => { answerMap[a.qid] = a; });

      let totalScore = 0;
      const detailed = questions.map(q => {
        const a = answerMap[q.question_id] || {};
        const obtained = a.obtained !== undefined && a.obtained !== null
          ? Number(a.obtained)
          : (a.is_correct ? q.marks : 0);
        totalScore += obtained;
        return {
          question_id: q.question_id,
          question_type: q.question_type,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          marks: q.marks,
          student_answer: a.user_answer ?? a.answer ?? '',
          is_correct: !!a.is_correct,
          obtained,
        };
      });

      const percentage = assessment.total_marks > 0
        ? (totalScore / assessment.total_marks) * 100
        : 0;
      let grade = 'F';
      if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      return {
        submission_id: sub.submission_id,
        sid: sub.sid,
        firstname: sub.firstname,
        lastname: sub.lastname,
        reg: sub.reg,
        class: sub.class,
        program_id: sub.program_id,
        submission_date: sub.submission_date,
        feedback: sub.feedback || '',
        status: sub.status,
        total_score: totalScore,
        percentage: Number(percentage.toFixed(1)),
        grade,
        passed: totalScore >= assessment.passing_marks,
        questions: detailed,
      };
    });

    res.json({ assessment, submissions: processed });
  } catch (e) {
    console.error('Download answers error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Excel export — returns a real .xls file (HTML-table trick Excel accepts)
router.get('/download-answers/:assessmentId/excel', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  if (!assessmentId) return res.status(400).json({ error: 'Invalid assessment ID' });

  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Reuse the JSON endpoint logic by calling it internally via fetch is awkward;
    // simpler: re-run the query here
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
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
      `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class
       FROM assessment_submissions sub
       INNER JOIN student s ON sub.sid = s.sid
       WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')
       ORDER BY s.lastname, s.firstname`,
      [assessmentId]
    );

    const esc = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let html = `<html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;}
      th{background:#4CAF50;color:#fff;padding:8px;border:1px solid #ddd;}
      td{padding:6px;border:1px solid #ddd;}
      .correct{background:#d4edda;}
      .wrong{background:#f8d7da;}
    </style></head><body>`;

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
        return `<tr class="${rowClass}">
          <td>${idx + 1}</td>
          <td>${esc(q.question_text)}</td>
          <td>${studentAnswer ? esc(studentAnswer) : '<em>No answer</em>'}</td>
          <td>${esc(q.correct_answer)}</td>
          <td>${obtained}</td>
          <td>${q.marks}</td>
          <td>${a.is_correct ? '✓ Correct' : (studentAnswer ? '✗ Wrong' : '⚬ No Answer')}</td>
        </tr>`;
      }).join('');

      const percentage = assessment.total_marks > 0
        ? ((total / assessment.total_marks) * 100).toFixed(1)
        : '0.0';

      html += `<h2>${esc(assessment.title)} - Student Answer Sheet</h2>
        <h3>${esc(sub.firstname + ' ' + sub.lastname)} (${esc(sub.reg)})</h3>
        <table><tr><th colspan="2">Student Information</th></tr>
          <tr><td width="30%"><b>Name:</b></td><td>${esc(sub.firstname + ' ' + sub.lastname)}</td></tr>
          <tr><td><b>Registration:</b></td><td>${esc(sub.reg)}</td></tr>
          <tr><td><b>Class:</b></td><td>${esc(sub.class)}</td></tr>
          <tr><td><b>Submitted:</b></td><td>${new Date(sub.submission_date).toLocaleString()}</td></tr>
        </table><br>
        <table style="width:100%">
          <tr><th>#</th><th>Question</th><th>Student Answer</th><th>Correct Answer</th>
              <th>Obtained</th><th>Max</th><th>Status</th></tr>
          ${rows}
          <tr style="background:#f0f0f0;font-weight:bold;">
            <td colspan="4" style="text-align:right;">TOTAL:</td>
            <td>${total}</td>
            <td>${assessment.total_marks}</td>
            <td>${percentage}%</td>
          </tr>
        </table><br>`;
      if (sub.feedback) {
        html += `<div><b>Examiner Feedback:</b><br>${esc(sub.feedback)}</div>`;
      }
      html += '<hr style="margin:40px 0">';
    }

    html += '</body></html>';

    const safeTitle = assessment.title.replace(/[^A-Za-z0-9\-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_answers.xls"`);
    res.send(html);
  } catch (e) {
    console.error('Excel export error:', e);
    res.status(500).json({ error: e.message });
  }
});
// Paper-style HTML page for one submission (auto-prints on load)
router.get('/download-answers/:assessmentId/paper', async (req, res) => {
  const assessmentId = parseInt(req.params.assessmentId, 10);
  const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
  const tcode = req.session?.tcode || req.query.tcode;

  if (!assessmentId) return res.status(400).send('Invalid assessment ID');
  if (!tcode) return res.status(401).send('Not authenticated');

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).send('Teacher not found');
    const tid = teachers[0].tid;

    const [assessments] = await pool.query(
      `SELECT a.*, c.class_name FROM assessments a
       INNER JOIN class c ON a.cid = c.cid
       WHERE a.assessment_id = ? AND a.tid = ?`,
      [assessmentId, tid]
    );
    if (assessments.length === 0) return res.status(404).send('Assessment not found');
    const assessment = assessments[0];

    const [questions] = await pool.query(
      `SELECT question_id, question_type, question_text,
              option_a, option_b, option_c, option_d, correct_answer, marks
       FROM assessment_questions WHERE assessment_id = ?
       ORDER BY question_id ASC`,
      [assessmentId]
    );

    let sql = `SELECT sub.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
               FROM assessment_submissions sub
               INNER JOIN student s ON sub.sid = s.sid
               WHERE sub.assessment_id = ? AND sub.status IN ('submitted','graded')`;
    const params = [assessmentId];
    if (studentId) { sql += ' AND sub.sid = ?'; params.push(studentId); }
    sql += ' ORDER BY s.lastname, s.firstname';

    const [submissions] = await pool.query(sql, params);

    const esc = v => String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const nl2br = v => esc(v).replace(/\n/g, '<br>');

    let pages = '';

    for (const sub of submissions) {
      let answers = [];
      try { answers = sub.answers ? JSON.parse(sub.answers) : []; } catch {}
      const answerMap = {};
      answers.forEach(a => { answerMap[a.qid] = a; });

      let totalScore = 0;
      let qNum = 1;
      let questionsHtml = '';

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
          correctHtml = `Correct answer: <strong>${esc(q.correct_answer)}</strong>`;
          if (isMC) {
            if (q.option_a) correctHtml += `<br>A. ${esc(q.option_a)}`;
            if (q.option_b) correctHtml += `<br>B. ${esc(q.option_b)}`;
            if (q.option_c) correctHtml += `<br>C. ${esc(q.option_c)}`;
            if (q.option_d) correctHtml += `<br>D. ${esc(q.option_d)}`;
          }
        } else {
          correctHtml = nl2br(q.correct_answer || '');
        }

        questionsHtml += `
          <div class="question-block">
            <div class="question-text">
              <strong>Question ${qNum}</strong> (${q.marks} marks)<br>
              ${nl2br(q.question_text)}
              ${optionsHtml}
            </div>

            <div class="student-answer">
              <strong>✍️ STUDENT'S ANSWER:</strong><br>
              ${hasAnswer
                ? `${nl2br(studentAnswer)}
                   <div class="answer-status">
                     <span class="${isCorrect ? 'tick' : 'cross'}">${isCorrect ? '✓ CORRECT' : '✗ WRONG'}</span>
                   </div>`
                : `<em>No answer provided</em>
                   <div class="answer-status"><span class="cross">✗ NO ANSWER</span></div>`}
            </div>

            <div class="correct-answer">
              <strong>✓ CORRECT/MODEL ANSWER:</strong><br>
              ${correctHtml}
            </div>

            <div class="marks-box">
              <strong>Marks Obtained:</strong> ${obtained} / ${q.marks}
            </div>
          </div>
        `;
        qNum++;
      }

      const percentage = assessment.total_marks > 0
        ? (totalScore / assessment.total_marks) * 100
        : 0;
      const grade = percentage >= 80 ? 'A'
        : percentage >= 70 ? 'B'
        : percentage >= 60 ? 'C'
        : percentage >= 50 ? 'D' : 'F';

      pages += `
        <div class="page">
          <div class="header">
            <div class="school-name">FUTURE KING SCHOOLS</div>
            <div>Excellence in Education</div>
            <div class="assessment-title">${esc(assessment.title).toUpperCase()}</div>
            <div>Student Answer Sheet</div>
          </div>

          <div class="student-info">
            <h4>STUDENT INFORMATION</h4>
            <table>
              <tr><td width="30%"><strong>Student Name:</strong></td><td>${esc(sub.firstname + ' ' + sub.lastname)}</td>
                  <td width="30%"><strong>Registration No:</strong></td><td>${esc(sub.reg)}</td></tr>
              <tr><td><strong>Class:</strong></td><td>${esc(sub.class)}</td>
                  <td><strong>Program ID:</strong></td><td>${esc(sub.program_id)}</td></tr>
              <tr><td><strong>Submitted Date:</strong></td><td>${new Date(sub.submission_date).toLocaleString()}</td>
                  <td><strong>Status:</strong></td><td>${esc(sub.status)}</td></tr>
            </table>
          </div>

          <div class="student-info" style="background:#e8f4fd;">
            <h4>ASSESSMENT INFORMATION</h4>
            <table>
              <tr><td width="30%"><strong>Assessment Title:</strong></td><td>${esc(assessment.title)}</td>
                  <td width="30%"><strong>Class:</strong></td><td>${esc(assessment.class_name)}</td></tr>
              <tr><td><strong>Total Marks:</strong></td><td>${assessment.total_marks}</td>
                  <td><strong>Passing Marks:</strong></td><td>${assessment.passing_marks}</td></tr>
              <tr><td><strong>Duration:</strong></td><td>${assessment.duration_minutes || 'No limit'} minutes</td>
                  <td><strong>Assessment Type:</strong></td><td>${esc(assessment.assessment_type)}</td></tr>
            </table>
          </div>

          <h3>QUESTIONS AND ANSWERS</h3>
          ${questionsHtml}

          <div class="score-summary">
            <table style="width:100%;text-align:center;">
              <tr>
                <td><strong>Total Score:</strong><br>${totalScore} / ${assessment.total_marks}</td>
                <td><strong>Percentage:</strong><br>${percentage.toFixed(1)}%</td>
                <td><strong>Grade:</strong><br>${grade}</td>
              </tr>
              <tr><td colspan="3"><strong>Status:</strong>
                ${totalScore >= assessment.passing_marks
                  ? '<span style="color:green;">✓ PASSED</span>'
                  : '<span style="color:red;">✗ FAILED</span>'}
              </td></tr>
            </table>
          </div>

          ${sub.feedback ? `
            <div style="margin-top:20px;padding:15px;background:#fff3cd;border-left:4px solid #ffc107;">
              <strong>📝 EXAMINER FEEDBACK:</strong><br>${nl2br(sub.feedback)}
            </div>` : ''}

          <div class="footer">
            <table style="width:100%;margin-top:40px;">
              <tr>
                <td style="border-top:1px solid #000;padding-top:10px;">Examiner's Signature: _________________</td>
                <td style="border-top:1px solid #000;padding-top:10px;">Date: ${new Date().toLocaleDateString()}</td>
              </tr>
            </table>
            <div>This is a computer-generated document. No signature required.</div>
            <div>Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${esc(assessment.title)} - Answer Sheets</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:"Times New Roman",Times,serif;background:white;padding:20px;}
  .page{max-width:900px;margin:0 auto;page-break-after:always;}
  .page:last-child{page-break-after:auto;}
  .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #000;}
  .school-name{font-size:24px;font-weight:bold;margin-bottom:5px;}
  .assessment-title{font-size:20px;font-weight:bold;margin:15px 0 5px;}
  .student-info{margin:20px 0;padding:15px;border:1px solid #ccc;background:#f9f9f9;}
  .student-info table{width:100%;border-collapse:collapse;}
  .student-info td{padding:8px;}
  .question-block{margin-bottom:25px;page-break-inside:avoid;}
  .question-text{font-weight:bold;margin-bottom:10px;padding:10px;background:#e8f4fd;border-left:4px solid #4CAF50;}
  .student-answer{margin:10px 0;padding:12px;background:#f8f9fa;border-left:3px solid #1a73e8;}
  .correct-answer{margin:10px 0;padding:12px;background:#e6f4ea;border-left:3px solid #34a853;}
  .marks-box{margin-top:10px;text-align:right;border-top:1px dashed #ccc;padding-top:8px;}
  .score-summary{margin-top:30px;padding:15px;border:2px solid #000;text-align:center;background:#f0f0f0;}
  .footer{margin-top:30px;text-align:center;font-size:12px;border-top:1px solid #ccc;padding-top:10px;}
  .tick{color:green;font-weight:bold;display:inline-block;background:#d4edda;padding:2px 8px;border-radius:4px;}
  .cross{color:red;font-weight:bold;display:inline-block;background:#f8d7da;padding:2px 8px;border-radius:4px;}
  .answer-status{margin-top:8px;}
  .options{margin:10px 0 10px 20px;font-size:14px;}
  .no-print{text-align:center;padding:15px;background:#e8f4fd;margin-bottom:20px;border-radius:8px;}
  .no-print button{padding:10px 24px;background:#0d3d0d;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;}
  @media print {
    body{padding:0;margin:0;}
    .no-print{display:none;}
  }
</style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <p style="margin-top:8px;font-size:13px;color:#555;">The print dialog will open automatically.</p>
  </div>
  ${pages}
  <script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400);});</script>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error('Paper generation error:', e);
    res.status(500).send('Error generating paper: ' + e.message);
  }
});
// ============ TEACHER CLASS PICKER ============
router.get('/__ping', (req, res) => {
  res.json({ ok: true, file: 'teacher router', time: new Date().toISOString() });
});
router.get('/teacher-classes', async (req, res) => {
  const tcode = req.session?.tcode || req.query.tcode;
  if (!tcode) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const [teachers] = await pool.query('SELECT tid FROM teacher WHERE tcode = ?', [tcode]);
    if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const tid = teachers[0].tid;

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
module.exports = router;