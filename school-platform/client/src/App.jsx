import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLogin from './pages/AdminLogin';
import AdminShell from './pages/admin/AdminShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminClasses from './pages/admin/AdminClasses';
import AdminYears from './pages/admin/AdminYears';
import AdminModules from './pages/admin/AdminModules';
import AdminStudentClasses from './pages/admin/AdminStudentClasses';
import AdminStudentRoster from './pages/admin/AdminStudentRoster';
import AdminSchool from './pages/admin/AdminSchool';
import AdminAssessment from './pages/admin/AdminAssessment';
// Grant Permission Components
import AdminGrant from './pages/admin/AdminGrant';
import TeacherPermission from './pages/admin/TeacherPermission';
import PermissionModules from './pages/admin/PermissionModules';
// Revoke Permission Components
import AdminRevoke from './pages/admin/AdminRevoke';
import AdminRemove from './pages/admin/AdminRemove';
import RevokeModule from './pages/admin/RevokeModules';
// Report Components
import ReportClass from './pages/admin/ReportClass';
import ReportYear from './pages/admin/ReportYear';
import ReportTerm from './pages/admin/ReportTerm';
import ReportCard from './pages/admin/ReportCard';
import YearlyReport from './pages/admin/YearlyReport';
// Proclamation/Ranking Components
import ProclamationYear from './pages/admin/ProclamationYear';
import ProclamationTerm from './pages/admin/ProclamationTerm';
import Proclamation from './pages/admin/Proclamation';
// Student Promotion Component
import StudentPromotion from './pages/admin/StudentPromotion';
// Timetable Component
import TimetableManager from './pages/admin/TimetableManager';
// Other Components
import DodShell from './pages/dod/DodShell';
import DodClassList from './pages/dod/DodClassList';
import DodYearPick from './pages/dod/DodYearPick';
import DodTermPick from './pages/dod/DodTermPick';
import DodMarksSheet from './pages/dod/DodMarksSheet';
import StudentLogin from './pages/StudentLogin';
import StudentLayout from './pages/StudentLayout';
import StudentDashboard from './pages/StudentDashboard';
import StudentNotifications from './pages/StudentNotifications';
import StudentAssessments from './pages/StudentAssessments';
import StudentOnlineClasses from './pages/student/StudentOnlineClasses';
import StudentResults from './pages/student/StudentResults';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentProfile from './pages/student/StudentProfile';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import TeacherCode from './pages/TeacherCode';
import TeacherPassword from './pages/TeacherPassword';
import TeacherCreatePassword from './pages/TeacherCreatePassword';
import TeacherShell from './pages/teacher/TeacherShell';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherMyClasses from './pages/teacher/TeacherMyClasses';
// ✅ REPLACED: TeacherOnlineClasses → TeacherManageOnlineClasses (full-featured management)
import TeacherManageOnlineClasses from './pages/teacher/TeacherManageOnlineClasses';
import TeacherScheduleClass from './pages/teacher/TeacherScheduleClass';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import TeacherManageAssessments from './pages/teacher/TeacherManageAssessments';
// ✅ COMBINED: Create Assessment + Add Questions in one file (wizard)
import TeacherCreateAssessment from './pages/teacher/TeacherCreateAssessment';
// ✅ Grade Submissions - React component (replaces grade_submissions.php)
import TeacherGradeSubmissions from './pages/teacher/TeacherGradeSubmissions';
// ✅ Assessment Reports - React component (replaces assessment_reports.php)
import TeacherAssessmentReports from './pages/teacher/TeacherAssessmentReports';
// ✅ Download Responses - React component (replaces teacher_download_responses.php)
import TeacherDownloadResponses from './pages/teacher/TeacherDownloadResponses';
// ✅ Class Picker - React component (replaces classes.php)
import TeacherClassesPicker from './pages/teacher/TeacherClassesPicker';
// ✅ Module Picker - React component (replaces modules.php)
import TeacherModulesPicker from './pages/teacher/TeacherModulesPicker';
// ✅ Marks Entry - React component (replaces marks.php)
import TeacherMarksEntry from './pages/teacher/TeacherMarksEntry';
// ✅ Upload Marks (auto-save) - React component (replaces upload.php)
import TeacherUploadMarks from './pages/teacher/TeacherUploadMarks';
// ✅ mymodule.php - Choose Class (update marks flow)
import TeacherMymodule from './pages/teacher/TeacherMymodule';
// ✅ module_year.php - Choose Year (update marks flow)
import TeacherModuleYear from './pages/teacher/TeacherModuleYear';
// ✅ module_term.php - Choose Term (update marks flow)
import TeacherModuleTerm from './pages/teacher/TeacherModuleTerm';
// ✅ mymodules.php - Choose Module (with term/year context)
import TeacherMymodules from './pages/teacher/TeacherMymodules';
// ✅ list.php - Read-only marks list (renamed)
import StudentMarkList from './pages/teacher/StudentMarkList';
// ✅ edit.php - Editable marks (renamed)
import StudentEditMarks from './pages/teacher/StudentEditMarks';
// ✅ view_results.php - Completed assessment results
import TeacherViewResults from './pages/teacher/TeacherViewResults';
// ✅ discussion_forum.php - Teacher discussion forums
import TeacherDiscussionForum from './pages/teacher/TeacherDiscussionForum';
// ✅ mark_attendance.php - Mark student attendance
import TeacherMarkAttendance from './pages/teacher/TeacherMarkAttendance';
// ✅ attendance_report.php - Monthly attendance report
import TeacherAttendanceReport from './pages/teacher/TeacherAttendanceReport';
// ✅ upload_materials.php - Upload study materials
import TeacherUploadMaterials from './pages/teacher/TeacherUploadMaterials';
// ✅ class_reports.php - Class analytics
import TeacherClassReports from './pages/teacher/TeacherClassReports';
// ✅ student_performance.php - Per-student performance
import TeacherStudentPerformance from './pages/teacher/TeacherStudentPerformance';
import ModuleMap from './pages/ModuleMap';
import RequireRole from './components/RequireRole';
import { RequireAdmin, RequireDod } from './components/RequireDashboard';
import PhpPlaceholder from './components/PhpPlaceholder';

// PHP Placeholders for remaining PHP files
const ADMIN_PHP = [
  // 'assessment' removed - now using React component AdminAssessment
  // 'progression' removed - now using React component StudentPromotion
  // 'ranking' removed - now using React component Proclamation
  // 'report' removed - now using React components ReportClass, ReportYear, etc.
  // 'grant' removed - now using React components AdminGrant, etc.
  // 'revoke' removed - now using React components AdminRevoke, etc.
];

// Teacher PHP placeholders
// NOTE: Almost everything is now React. Only two placeholders remain.
const TEACHER_PHP = [
  ['send-message', 'Send Message', 'send_message.php'],
  ['e-portfolio', 'E-Portfolio', 'e_portfolio.php'],
];

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/login/teacher" element={<TeacherCode />} />
      <Route path="/login/teacher/password" element={<TeacherPassword />} />
      <Route path="/login/teacher/create-password" element={<TeacherCreatePassword />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AdminDashboard />} />
        <Route path="teacher" element={<AdminTeachers />} />
        <Route path="students" element={<AdminStudentClasses />} />
        <Route path="students/class/:cid" element={<AdminStudentRoster />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="modules" element={<AdminModules />} />
        <Route path="year" element={<AdminYears />} />
        <Route path="school" element={<AdminSchool />} />

        {/* Assessment Route - React Component */}
        <Route path="assessment" element={<AdminAssessment />} />

        {/* Grant Permission Routes */}
        <Route path="grant" element={<AdminGrant />} />
        <Route path="permition" element={<TeacherPermission />} />
        <Route path="permision-module" element={<PermissionModules />} />

        {/* Revoke Permission Routes */}
        <Route path="revoke" element={<AdminRevoke />} />
        <Route path="remove" element={<AdminRemove />} />
        <Route path="revoke_module" element={<RevokeModule />} />

        {/* Report Routes */}
        <Route path="report" element={<ReportClass />} />
        <Route path="report-year" element={<ReportYear />} />
        <Route path="report-term" element={<ReportTerm />} />
        <Route path="report-card" element={<ReportCard />} />
        <Route path="yearly-report" element={<YearlyReport />} />

        {/* Proclamation/Ranking Routes */}
        <Route path="proclamation-year" element={<ProclamationYear />} />
        <Route path="proclamation-term" element={<ProclamationTerm />} />
        <Route path="proclamation" element={<Proclamation />} />

        {/* Student Promotion Route - React Component */}
        <Route path="progression" element={<StudentPromotion />} />

        {/* Timetable Management Route */}
        <Route path="timetable" element={<TimetableManager />} />

        {/* PHP Placeholder Routes */}
        {ADMIN_PHP.map(([path, title, php]) => (
          <Route
            key={path}
            path={path}
            element={<PhpPlaceholder title={title} phpFile={php} backTo="/admin/home" backLabel="Dashboard" />}
          />
        ))}
      </Route>

      {/* DOD Routes */}
      <Route
        path="/dod"
        element={
          <RequireDod>
            <DodShell />
          </RequireDod>
        }
      >
        <Route index element={<DodClassList />} />
        <Route path="class/:cid" element={<DodYearPick />} />
        <Route path="class/:cid/year/:yearId" element={<DodTermPick />} />
        <Route path="class/:cid/year/:yearId/term/:term" element={<DodMarksSheet />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <RequireRole role="student">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="assessments" element={<StudentAssessments />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="online-classes" element={<StudentOnlineClasses />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route
          path="forum"
          element={<PhpPlaceholder title="Discussion Forum" phpFile="student_forum.php" backTo="/student/dashboard" backLabel="Dashboard" />}
        />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <RequireRole role="teacher">
            <TeacherShell />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherHome />} />
        <Route path="my-classes" element={<TeacherMyClasses />} />

        {/* ✅ Schedule Class */}
        <Route path="schedule-class" element={<TeacherScheduleClass />} />

        {/* ✅ Manage Online Classes */}
        <Route path="manage-online-classes" element={<TeacherManageOnlineClasses />} />

        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="manage-assessments" element={<TeacherManageAssessments />} />

        {/* ✅ Create Assessment + Add Questions */}
        <Route path="create-assessment" element={<TeacherCreateAssessment />} />
        <Route path="create-assessment/:assessmentId" element={<TeacherCreateAssessment />} />

        {/* ✅ Grade Submissions */}
        <Route path="grade-submissions" element={<TeacherGradeSubmissions />} />
        <Route path="grade-submissions/:assessmentId" element={<TeacherGradeSubmissions />} />

        {/* ✅ Assessment Reports */}
        <Route path="assessment-reports" element={<TeacherAssessmentReports />} />

        {/* ✅ Download Responses */}
        <Route path="download-responses" element={<TeacherDownloadResponses />} />

        {/* ✅ Class Picker (classes.php) */}
        <Route path="classes" element={<TeacherClassesPicker />} />

        {/* ✅ Module Picker (modules.php) */}
        <Route path="modules" element={<TeacherModulesPicker />} />

        {/* ✅ Marks Entry (marks.php) */}
        <Route path="marks" element={<TeacherMarksEntry />} />

        {/* ✅ Upload Marks (upload.php) */}
        <Route path="upload-marks" element={<TeacherUploadMarks />} />

        {/* ✅ mymodule.php - Choose Class */}
        <Route path="mymodule" element={<TeacherMymodule />} />

        {/* ✅ module_year.php - Choose Year */}
        <Route path="module-year" element={<TeacherModuleYear />} />

        {/* ✅ module_term.php - Choose Term */}
        <Route path="module-term" element={<TeacherModuleTerm />} />

        {/* ✅ mymodules.php - Choose Module */}
        <Route path="mymodules" element={<TeacherMymodules />} />

        {/* ✅ list.php - Read-only marks list */}
        <Route path="list" element={<StudentMarkList />} />

        {/* ✅ edit.php - Editable marks */}
        <Route path="edit-marks" element={<StudentEditMarks />} />

        {/* ✅ view_results.php - Completed assessment results */}
        <Route path="view-results" element={<TeacherViewResults />} />

        {/* ✅ discussion_forum.php - Teacher discussion forums */}
        <Route path="discussion-forum" element={<TeacherDiscussionForum />} />

        {/* ✅ mark_attendance.php - Mark attendance */}
        <Route path="mark-attendance" element={<TeacherMarkAttendance />} />

        {/* ✅ attendance_report.php - Monthly attendance report */}
        <Route path="attendance-report" element={<TeacherAttendanceReport />} />

        {/* ✅ upload_materials.php - Study materials */}
        <Route path="upload-materials" element={<TeacherUploadMaterials />} />

        {/* ✅ class_reports.php - Class analytics */}
        <Route path="class-reports" element={<TeacherClassReports />} />

        {/* ✅ student_performance.php - Per-student performance */}
        <Route path="student-performance" element={<TeacherStudentPerformance />} />

        {/* PHP Placeholders — remaining ones only */}
        {TEACHER_PHP.map(([path, title, php]) => (
          <Route
            key={path}
            path={path}
            element={<PhpPlaceholder title={title} phpFile={php} backTo="/teacher/dashboard" backLabel="Teacher home" />}
          />
        ))}
      </Route>

      {/* Module Map Route */}
      <Route path="/modules" element={<ModuleMap />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}