// src/api/client.js

const AUTH_KEY = 'school_portal_auth';
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://school-information-management-kqee.onrender.com')
).replace(/\/+$/, '');

// ============================================================================
// AUTH STORAGE (unchanged)
// ============================================================================
export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function setStoredAuth(data) {
  localStorage.removeItem(AUTH_KEY);
  if (!data) return;
  if (!data.token || !data.user) {
    console.error('[auth] setStoredAuth: missing token or user', data);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token: data.token, user: data.user }));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('teacher');
  localStorage.removeItem('student');
  try { sessionStorage.clear(); } catch {}
}

// ============================================================================
// HELPERS
// ============================================================================
function clientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Error class so callers can inspect `.status`, `.body`, `.isNetwork`.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, body = null, isNetwork = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.isNetwork = isNetwork;
  }
}

// ============================================================================
// CORE FETCH — with timezone header, retries, typed errors
// ============================================================================
export async function apiFetch(path, options = {}, _retry = 0) {
  const auth = getStoredAuth();
  const isFormData = options.body instanceof FormData;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'X-Client-Timezone': clientTimezone(),
    ...(options.headers || {}),
  };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = isIdempotent ? 3 : 0;

  let res;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch (networkErr) {
    // Retry idempotent requests on transient network errors
    if (isIdempotent && _retry < maxRetries) {
      await new Promise((r) => setTimeout(r, 2 ** _retry * 500));
      return apiFetch(path, options, _retry + 1);
    }
    throw new ApiError(
      `Network error (backend down?): ${networkErr.message}`,
      { isNetwork: true }
    );
  }

  // Honor Retry-After on 429 (GET only, to avoid replaying writes)
  if (res.status === 429 && isIdempotent && _retry < maxRetries) {
    const wait = parseInt(res.headers.get('Retry-After') || '2', 10) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return apiFetch(path, options, _retry + 1);
  }

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || 'Invalid response' };
  }

  if (!res.ok) {
    console.error(
      `[apiFetch] ${res.status} ${method} ${path}`,
      body?.error || '(no error)'
    );
    throw new ApiError(
      body?.error || res.statusText || `HTTP ${res.status}`,
      { status: res.status, body }
    );
  }
  return body;
}

// ============================================================================
// AUTH APIS (unchanged)
// ============================================================================
export async function adminLogin(data) { return apiFetch('/api/auth/admin/login', { method: 'POST', body: JSON.stringify(data) }); }
export async function studentLogin(data) { return apiFetch('/api/auth/student/login', { method: 'POST', body: JSON.stringify(data) }); }
export async function teacherLogin(data) { return apiFetch('/api/auth/teacher/login', { method: 'POST', body: JSON.stringify(data) }); }
export async function getTeacherStatus(tcode) { return apiFetch(`/api/auth/teacher/status?tcode=${encodeURIComponent(tcode)}`); }
export async function initTeacherUser(data) { return apiFetch('/api/auth/teacher/init-user', { method: 'POST', body: JSON.stringify(data) }); }
export async function createTeacherPassword(data) { return apiFetch('/api/auth/teacher/create-password', { method: 'POST', body: JSON.stringify(data) }); }

// ============================================================================
// UTILITIES (unchanged)
// ============================================================================
export function isAuthenticated() { return !!getStoredAuth()?.token; }
export function getCurrentUser() { return getStoredAuth()?.user || null; }
export function isAdmin() { const u = getCurrentUser(); return u?.role === 'admin' && Number(u?.position) === 1; }
export function isDod() { const u = getCurrentUser(); return u?.role === 'admin' && Number(u?.position) === 3; }
export function isTeacher() { return getCurrentUser()?.role === 'teacher'; }
export function isStudent() { return getCurrentUser()?.role === 'student'; }
export function logout() { clearStoredAuth(); }

// ============================================================================
// ADMIN APIS (unchanged)
// ============================================================================
export async function getGrantTeachers() { return apiFetch('/api/admin/grant-teachers'); }
export async function getGrantTeacher(tid) { return apiFetch(`/api/admin/grant-teacher/${tid}`); }
export async function getGrantClasses() { return apiFetch('/api/admin/grant-classes'); }
export async function getGrantModules(classId) { return apiFetch(`/api/admin/grant-modules/${classId}`); }
export async function checkTeacherPermission(data) { return apiFetch('/api/admin/check-teacher-permission', { method: 'POST', body: JSON.stringify(data) }); }
export async function checkClassPermission(data) { return apiFetch('/api/admin/check-class-permission', { method: 'POST', body: JSON.stringify(data) }); }
export async function grantPermission(data) { return apiFetch('/api/admin/grant-permission', { method: 'POST', body: JSON.stringify(data) }); }
export async function getAdminDashboard() { return apiFetch('/api/admin/dashboard'); }
export async function getAdminClasses() { return apiFetch('/api/admin/classes-all'); }
export async function getAdminTeachers() { return apiFetch('/api/admin/teachers'); }
export async function createTeacher(data) { return apiFetch('/api/admin/teachers', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteTeacher(tid) { return apiFetch(`/api/admin/teachers/${tid}`, { method: 'DELETE' }); }
export async function getAdminClassesAdmin() { return apiFetch('/api/admin/classes-admin'); }
export async function createClass(data) { return apiFetch('/api/admin/classes-admin', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteClass(cid) { return apiFetch(`/api/admin/classes-admin/${cid}`, { method: 'DELETE' }); }
export async function getAdminYears() { return apiFetch('/api/admin/years-admin'); }
export async function createYear(data) { return apiFetch('/api/admin/years-admin', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteYear(id) { return apiFetch(`/api/admin/years-admin/${id}`, { method: 'DELETE' }); }
export async function getAdminModules() { return apiFetch('/api/admin/modules-admin'); }
export async function createModule(data) { return apiFetch('/api/admin/modules-admin', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteModule(id) { return apiFetch(`/api/admin/modules-admin/${id}`, { method: 'DELETE' }); }
export async function getStudentsInClass(cid) { return apiFetch(`/api/admin/students-in-class?cid=${cid}`); }
export async function getStudent(sid) { return apiFetch(`/api/admin/students/${sid}`); }
export async function getSchoolAdmin() { return apiFetch('/api/admin/school-admin'); }
export async function updateSchoolAdmin(data) { return apiFetch('/api/admin/school-admin', { method: 'PATCH', body: JSON.stringify(data) }); }
export async function getTeacherPermittedClasses(teacherId) { return apiFetch(`/api/admin/teacher-permitted-classes/${teacherId}`); }
export async function getTeacherModulesByClass(teacherId, classId) { return apiFetch(`/api/admin/teacher-modules-by-class/${teacherId}/${classId}`); }
export async function revokePermission(data) { return apiFetch('/api/admin/revoke-permission', { method: 'DELETE', body: JSON.stringify(data) }); }

// ============================================================================
// TEACHER APIS (unchanged)
// ============================================================================
export async function getTeacherDashboard() { return apiFetch('/api/teacher/dashboard'); }
export async function getTeacherMyClasses() { return apiFetch('/api/teacher/my-classes'); }
export async function getTeacherClasses() { return apiFetch('/api/teacher/teacher-classes'); }
export async function getAssessmentClasses() { return apiFetch('/api/teacher/assessment-classes'); }
export async function createAssessment(payload) { return apiFetch('/api/teacher/create-assessment', { method: 'POST', body: JSON.stringify(payload) }); }
export async function addQuestion(assessmentId, payload) { return apiFetch(`/api/teacher/assessments/${assessmentId}/questions`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function getQuestions(assessmentId) { return apiFetch(`/api/teacher/assessments/${assessmentId}/questions`); }
export async function deleteQuestion(questionId) { return apiFetch(`/api/teacher/assessment-questions/${questionId}`, { method: 'DELETE' }); }
export async function publishAssessment(assessmentId) { return apiFetch(`/api/teacher/assessments/${assessmentId}/publish`, { method: 'PUT' }); }
export async function getAssessment(assessmentId) { return apiFetch(`/api/teacher/assessments/${assessmentId}`); }
export async function getManageAssessments() { return apiFetch('/api/teacher/manage-assessments'); }
export async function getAssessmentGrade(assessmentId) { return apiFetch(`/api/teacher/assessments/${assessmentId}/grade`); }
export async function saveSubmissionGrade(submissionId, payload) { return apiFetch(`/api/teacher/submissions/${submissionId}/grade`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function getReportClasses() { return apiFetch('/api/teacher/report-classes'); }
export async function getReportAssessments(cid) { return apiFetch(`/api/teacher/report-assessments/${cid}`); }
export async function getClassPerformance(cid) { return apiFetch(`/api/teacher/report-class-performance/${cid}`); }
export async function getAssessmentReport(assessmentId) { return apiFetch(`/api/teacher/report-assessment/${assessmentId}`); }
export async function getDownloadAssessments() { return apiFetch('/api/teacher/download-assessments'); }
export async function getDownloadAnswers(assessmentId, studentId = null) { const qs = studentId ? `?student_id=${studentId}` : ''; return apiFetch(`/api/teacher/download-answers/${assessmentId}${qs}`); }
export async function getOnlineClasses() { return apiFetch('/api/teacher/online-classes'); }
export async function getOnlineClass(id) { return apiFetch(`/api/teacher/online-classes/${id}`); }
export async function scheduleClass(payload) { return apiFetch('/api/teacher/schedule-class', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateOnlineClass(id, payload) { return apiFetch(`/api/teacher/online-classes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); }
export async function deleteOnlineClass(id) { return apiFetch(`/api/teacher/online-classes/${id}`, { method: 'DELETE' }); }
export async function startOnlineClass(id) { return apiFetch(`/api/teacher/online-classes/${id}/start`, { method: 'PUT' }); }
export async function endOnlineClass(id) { return apiFetch(`/api/teacher/online-classes/${id}/end`, { method: 'PUT' }); }
export async function getWaitingRoom(classId) { return apiFetch(`/api/teacher/online-classes/${classId}/waiting-room`); }
export async function approveStudent(classId, sid) { return apiFetch(`/api/teacher/online-classes/${classId}/approve-student`, { method: 'POST', body: JSON.stringify({ sid }) }); }
export async function rejectStudent(classId, sid) { return apiFetch(`/api/teacher/online-classes/${classId}/reject-student`, { method: 'POST', body: JSON.stringify({ sid }) }); }
export async function getClassChat(classId) { return apiFetch(`/api/teacher/online-classes/${classId}/chat`); }
export async function sendClassChat(classId, message) { return apiFetch(`/api/teacher/online-classes/${classId}/chat`, { method: 'POST', body: JSON.stringify({ message }) }); }
export async function getClassAttendance(classId) { return apiFetch(`/api/teacher/online-classes/${classId}/attendance`); }

// ============ ASSESSMENT MANAGEMENT (EDIT & DELETE) ============
export async function updateAssessment(assessmentId, payload) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function resetStudentAssessment(assessmentId, sid) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/reset-student/${sid}`, {
    method: 'DELETE',
  });
}
export async function deleteAssessment(assessmentId) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// NEW: TEACHER APPROVAL (for assessment start requests)
// ============================================================================
export async function approveAssessmentStart(assessmentId, sid) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/approve/${sid}`, {
    method: 'POST',
  });
}
export async function rejectAssessmentStart(assessmentId, sid) {
  return apiFetch(`/api/teacher/assessments/${assessmentId}/reject/${sid}`, {
    method: 'POST',
  });
}

// ============================================================================
// NEW: STUDENT HEARTBEAT (anti-cheat telemetry)
// ============================================================================
export async function sendAssessmentHeartbeat(assessmentId, { warnings = 0, elapsed = 0 } = {}) {
  return apiFetch(`/api/student/assessments/${assessmentId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ warnings, elapsed }),
  });
}

// ============================================================================
// NEW: PAGINATED ASSESSMENTS
// ============================================================================
export async function getStudentAssessments({ cursor = null, limit = 50 } = {}) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', limit);
  return apiFetch(`/api/student/assessments?${qs.toString()}`);
}