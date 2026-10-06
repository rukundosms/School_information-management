const AUTH_KEY = 'school_portal_auth';

// Optional base URL. Leave '' if you rely on Vite's proxy or a same-origin setup.
const API_BASE = '';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(data) {
  if (data) localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  else localStorage.removeItem(AUTH_KEY);
}

export async function apiFetch(path, options = {}) {
  const auth = getStoredAuth();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',   // ← CRITICAL: send session cookie
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || 'Invalid response' };
  }

  if (!res.ok) {
    const err = new Error(body?.error || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// ============ GRANT PERMISSION APIS ============
export async function getGrantTeachers() {
  return apiFetch('/api/admin/grant-teachers');
}
export async function getGrantTeacher(tid) {
  return apiFetch(`/api/admin/grant-teacher/${tid}`);
}
export async function getGrantClasses() {
  return apiFetch('/api/admin/grant-classes');
}
export async function getGrantModules(classId) {
  return apiFetch(`/api/admin/grant-modules/${classId}`);
}
export async function checkTeacherPermission(data) {
  return apiFetch('/api/admin/check-teacher-permission', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function checkClassPermission(data) {
  return apiFetch('/api/admin/check-class-permission', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function grantPermission(data) {
  return apiFetch('/api/admin/grant-permission', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ EXISTING ADMIN APIS ============
export async function getAdminDashboard() {
  return apiFetch('/api/admin/dashboard');
}
export async function getAdminClasses() {
  return apiFetch('/api/admin/classes-all');
}
export async function getAdminTeachers() {
  return apiFetch('/api/admin/teachers');
}
export async function createTeacher(data) {
  return apiFetch('/api/admin/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function deleteTeacher(tid) {
  return apiFetch(`/api/admin/teachers/${tid}`, { method: 'DELETE' });
}
export async function getAdminClassesAdmin() {
  return apiFetch('/api/admin/classes-admin');
}
export async function createClass(data) {
  return apiFetch('/api/admin/classes-admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function deleteClass(cid) {
  return apiFetch(`/api/admin/classes-admin/${cid}`, { method: 'DELETE' });
}
export async function getAdminYears() {
  return apiFetch('/api/admin/years-admin');
}
export async function createYear(data) {
  return apiFetch('/api/admin/years-admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function deleteYear(id) {
  return apiFetch(`/api/admin/years-admin/${id}`, { method: 'DELETE' });
}
export async function getAdminModules() {
  return apiFetch('/api/admin/modules-admin');
}
export async function createModule(data) {
  return apiFetch('/api/admin/modules-admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function deleteModule(id) {
  return apiFetch(`/api/admin/modules-admin/${id}`, { method: 'DELETE' });
}
export async function getStudentsInClass(cid) {
  return apiFetch(`/api/admin/students-in-class?cid=${cid}`);
}
export async function getStudent(sid) {
  return apiFetch(`/api/admin/students/${sid}`);
}
export async function getSchoolAdmin() {
  return apiFetch('/api/admin/school-admin');
}
export async function updateSchoolAdmin(data) {
  return apiFetch('/api/admin/school-admin', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============ AUTH APIS ============
export async function adminLogin(data) {
  return apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function studentLogin(data) {
  return apiFetch('/api/student/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function getTeacherStatus(tcode) {
  return apiFetch(`/api/teacher/status?tcode=${encodeURIComponent(tcode)}`);
}
export async function initTeacherUser(data) {
  return apiFetch('/api/teacher/init-user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function createTeacherPassword(data) {
  return apiFetch('/api/teacher/create-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function teacherLogin(data) {
  return apiFetch('/api/teacher/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ UTILITY ============
export function isAuthenticated() {
  const auth = getStoredAuth();
  return auth && auth.token ? true : false;
}
export function getCurrentUser() {
  const auth = getStoredAuth();
  return auth?.user || null;
}
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.position === 1;
}
export function isDod() {
  const user = getCurrentUser();
  return user && user.position === 3;
}
export function isTeacher() {
  const user = getCurrentUser();
  return user && user.role === 'teacher';
}
export function isStudent() {
  const user = getCurrentUser();
  return user && user.role === 'student';
}
export function logout() {
  setStoredAuth(null);
}

// ============ REVOKE PERMISSION APIS ============
export async function getTeacherPermittedClasses(teacherId) {
  return apiFetch(`/api/admin/teacher-permitted-classes/${teacherId}`);
}
export async function getTeacherModulesByClass(teacherId, classId) {
  return apiFetch(`/api/admin/teacher-modules-by-class/${teacherId}/${classId}`);
}
export async function revokePermission(data) {
  return apiFetch('/api/admin/revoke-permission', {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

// ============ TEACHER CORE APIS ============
export async function getTeacherDashboard() {
  return apiFetch('/api/teacher/dashboard');
}
export async function getTeacherMyClasses() {
  return apiFetch('/api/teacher/my-classes');
}
export async function getTeacherClasses() {
  return apiFetch('/api/teacher/teacher-classes');
}
export async function getAssessmentClasses() {
  return apiFetch('/api/teacher/assessment-classes');
}

// ============ TEACHER ASSESSMENT APIS ============
export async function createAssessment(payload) {
  return apiFetch('/api/teacher/create-assessment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function addQuestion(assessmentId, payload) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/questions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function getQuestions(assessmentId) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/questions`);
}
export async function deleteQuestion(questionId) {
  return apiFetch(`/api/teacher/assessment-questions/${questionId}`, {
    method: 'DELETE',
  });
}
export async function publishAssessment(assessmentId) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/publish`, {
    method: 'PUT',
  });
}
export async function getAssessment(assessmentId) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}`);
}
export async function getManageAssessments() {
  return apiFetch('/api/teacher/manage-assessments');
}
export async function getAssessmentGrade(assessmentId) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/grade`);
}
export async function saveSubmissionGrade(submissionId, payload) {
  return apiFetch(`/api/teacher/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============ TEACHER REPORT APIS ============
export async function getReportClasses() {
  return apiFetch('/api/teacher/report-classes');
}
export async function getReportAssessments(cid) {
  return apiFetch(`/api/teacher/report-assessments/${cid}`);
}
export async function getClassPerformance(cid) {
  return apiFetch(`/api/teacher/report-class-performance/${cid}`);
}
export async function getAssessmentReport(assessmentId) {
  return apiFetch(`/api/teacher/report-assessment/${assessmentId}`);
}

// ============ TEACHER DOWNLOAD APIS ============
export async function getDownloadAssessments() {
  return apiFetch('/api/teacher/download-assessments');
}
export async function getDownloadAnswers(assessmentId, studentId = null) {
  const qs = studentId ? `?student_id=${studentId}` : '';
  return apiFetch(`/api/teacher/download-answers/${assessmentId}${qs}`);
}

// ============ TEACHER ONLINE CLASS APIS ============
export async function getOnlineClasses() {
  return apiFetch('/api/teacher/online-classes');
}
export async function getOnlineClass(id) {
  return apiFetch(`/api/teacher/online-classes/${id}`);
}
export async function scheduleClass(payload) {
  return apiFetch('/api/teacher/schedule-class', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateOnlineClass(id, payload) {
  return apiFetch(`/api/teacher/online-classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteOnlineClass(id) {
  return apiFetch(`/api/teacher/online-classes/${id}`, { method: 'DELETE' });
}
export async function startOnlineClass(id) {
  return apiFetch(`/api/teacher/online-classes/${id}/start`, { method: 'PUT' });
}
export async function endOnlineClass(id) {
  return apiFetch(`/api/teacher/online-classes/${id}/end`, { method: 'PUT' });
}
export async function getWaitingRoom(classId) {
  return apiFetch(`/api/teacher/online-classes/${classId}/waiting-room`);
}
export async function approveStudent(classId, sid) {
  return apiFetch(`/api/teacher/online-classes/${classId}/approve-student`, {
    method: 'POST',
    body: JSON.stringify({ sid }),
  });
}
export async function rejectStudent(classId, sid) {
  return apiFetch(`/api/teacher/online-classes/${classId}/reject-student`, {
    method: 'POST',
    body: JSON.stringify({ sid }),
  });
}
export async function getClassChat(classId) {
  return apiFetch(`/api/teacher/online-classes/${classId}/chat`);
}
export async function sendClassChat(classId, message) {
  return apiFetch(`/api/teacher/online-classes/${classId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
export async function getClassAttendance(classId) {
  return apiFetch(`/api/teacher/online-classes/${classId}/attendance`);
}