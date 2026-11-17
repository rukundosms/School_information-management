// src/pages/teacher/TeacherShell.jsx
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getStoredAuth, logout } from '../../api/client';

export default function TeacherShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = getStoredAuth()?.user || {};
  const teacherName = [user.fname, user.lname].filter(Boolean).join(' ') || user.tcode || 'Teacher';

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login/teacher');
  };

  const isActive = (...paths) =>
    paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-green-900 text-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-5 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{teacherName}</p>
              <p className="text-xs text-green-300">Teacher</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* MAIN */}
          <p className="menu-heading px-4 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Main
          </p>
          <MenuLink
            to="/teacher/dashboard"
            icon="fa-home"
            label="Dashboard"
            active={isActive('/teacher/dashboard')}
          />
          <MenuLink
            to="/teacher/my-classes"
            icon="fa-chalkboard"
            label="My Classes"
            active={isActive('/teacher/my-classes')}
          />

          {/* ONLINE CLASSES */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Online Classes
          </p>
          <MenuLink
            to="/teacher/schedule-class"
            icon="fa-calendar-plus"
            label="Schedule Class"
            active={isActive('/teacher/schedule-class')}
          />
          <MenuLink
            to="/teacher/manage-online-classes"
            icon="fa-video"
            label="Manage Online Classes"
            active={isActive('/teacher/manage-online-classes')}
          />

          {/* ASSESSMENTS */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Assessments
          </p>
          <MenuLink
            to="/teacher/create-assessment"
            icon="fa-plus-circle"
            label="Create Assessment"
            active={isActive('/teacher/create-assessment')}
          />
          <MenuLink
            to="/teacher/manage-assessments"
            icon="fa-tasks"
            label="Manage Assessments"
            active={isActive('/teacher/manage-assessments')}
          />
          <MenuLink
            to="/teacher/grade-submissions"
            icon="fa-check-double"
            label="Grade Submissions"
            active={isActive('/teacher/grade-submissions')}
          />
          <MenuLink
            to="/teacher/assessment-reports"
            icon="fa-chart-line"
            label="Assessment Reports"
            active={isActive('/teacher/assessment-reports')}
          />
          <MenuLink
            to="/teacher/download-responses"
            icon="fa-download"
            label="Download Responses"
            active={isActive('/teacher/download-responses')}
          />
          <MenuLink
            to="/teacher/view-results"
            icon="fa-file-alt"
            label="View Results"
            active={isActive('/teacher/view-results')}
          />

          {/* MARKS & RESULTS */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Marks &amp; Results
          </p>

          {/* Upload Marks → classes → modules → marks → upload-marks */}
          <MenuLink
            to="/teacher/classes"
            icon="fa-upload"
            label="Upload Marks"
            active={isActive(
              '/teacher/classes',
              '/teacher/modules',
              '/teacher/marks',
              '/teacher/upload-marks'
            )}
          />

          {/* Update Marks → mymodule → module-year → module-term → mymodules → list → edit-marks */}
          <MenuLink
            to="/teacher/mymodule"
            icon="fa-pen"
            label="Update Marks"
            active={isActive(
              '/teacher/mymodule',
              '/teacher/module-year',
              '/teacher/module-term',
              '/teacher/mymodules',
              '/teacher/list',
              '/teacher/edit-marks'
            )}
          />

          {/* COMMUNICATION */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Communication
          </p>
          <MenuLink
            to="/teacher/announcements"
            icon="fa-bullhorn"
            label="Announcements"
            active={isActive('/teacher/announcements')}
          />
          <MenuLink
            to="/teacher/discussion-forum"
            icon="fa-comments"
            label="Discussion Forum"
            active={isActive('/teacher/discussion-forum')}
          />

          {/* ATTENDANCE */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Attendance
          </p>
          <MenuLink
            to="/teacher/mark-attendance"
            icon="fa-user-check"
            label="Mark Attendance"
            active={isActive('/teacher/mark-attendance')}
          />
          <MenuLink
            to="/teacher/attendance-report"
            icon="fa-clipboard-list"
            label="Attendance Report"
            active={isActive('/teacher/attendance-report')}
          />

          {/* RESOURCES */}
          <p className="menu-heading px-4 mt-5 mb-2 text-[11px] uppercase tracking-wider text-green-300/80">
            Resources
          </p>
          <MenuLink
            to="/teacher/upload-materials"
            icon="fa-folder-open"
            label="Upload Materials"
            active={isActive('/teacher/upload-materials')}
          />
          <MenuLink
            to="/teacher/class-reports"
            icon="fa-file-invoice"
            label="Class Reports"
            active={isActive('/teacher/class-reports')}
          />
          <MenuLink
            to="/teacher/student-performance"
            icon="fa-chart-bar"
            label="Student Performance"
            active={isActive('/teacher/student-performance')}
          />
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-green-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-800 hover:bg-green-700 font-semibold text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-green-900 text-white px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-2xl leading-none"
            aria-label="Open menu"
          >
            <i className="fas fa-bars"></i>
          </button>
          <span className="font-semibold">Teacher</span>
          <div className="w-6"></div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ---------- Small subcomponents ---------- */

function MenuLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-green-600 text-white'
          : 'text-green-100 hover:bg-green-800'
      }`}
    >
      <i className={`fas ${icon} w-5 text-center`}></i>
      <span>{label}</span>
    </Link>
  );
}