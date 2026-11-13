import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin/teacher', label: 'Teachers', icon: 'fa-chalkboard-teacher' },
  { to: '/admin/students', label: 'Students', icon: 'fa-users' },
  { to: '/admin/classes', label: 'Classes', icon: 'fa-school' },
  { to: '/admin/modules', label: 'Modules', icon: 'fa-book' },
  { to: '/admin/assessment', label: 'Assessment', icon: 'fa-clipboard-check' },
  { to: '/admin/grant', label: 'Grant', icon: 'fa-key' },
  { to: '/admin/revoke', label: 'Revoke', icon: 'fa-ban' },
  { to: '/admin/year', label: 'Academic Year', icon: 'fa-calendar-alt' },
  { to: '/admin/report', label: 'Report', icon: 'fa-file-alt' },
  { to: '/admin/proclamation-year', label: 'Ranking', icon: 'fa-trophy' },
  { to: '/admin/school', label: 'School', icon: 'fa-university' },
  { to: '/admin/progression', label: 'Progression', icon: 'fa-user' },
  { to: '/admin/timetable', label: 'Timetable', icon: 'fa-clock' }, // ✅ CORRECTED: Added Timetable with 'to' property
  { to: '/admin/home', label: 'Dashboard', icon: 'fa-tachometer-alt', end: true },
];

const linkClass = ({ isActive }) =>
  [
    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left w-full',
    isActive 
      ? 'bg-school-bright text-white shadow-md scale-[1.02]' 
      : 'text-white/90 hover:bg-white/15 hover:scale-[1.01]',
  ].join(' ');

export default function AdminShell() {
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTime, setActiveTime] = useState(new Date());
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Update active time every second (for real-time clock)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  // Get current date and time formatted
  const formattedTime = activeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = activeTime.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-school to-school-dark text-white shadow-lg">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-white/15 transition-all duration-200 shrink-0"
              aria-label="Toggle menu"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars text-lg" />
            </button>
            <img 
              src="../../dist/assets/logo.png" 
              alt="School Logo" 
              className="w-10 h-10 rounded-full border-2 border-white/80 shrink-0 hidden sm:block object-cover" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-bold truncate">School Administration</h1>
              <div className="hidden sm:flex text-xs text-white/70 gap-2">
                <span><i className="far fa-calendar-alt mr-1"></i>{formattedDate}</span>
                <span><i className="far fa-clock mr-1"></i>{formattedTime}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* User info */}
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm bg-white/10 rounded-full px-3 py-1.5">
                <i className="fas fa-user-circle text-lg"></i>
                <span className="font-medium">{user.name || user.username || 'Admin'}</span>
              </div>
            )}
            
            {/* Quick actions */}
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 text-sm transition-all duration-200"
              onClick={() => window.location.href = '/admin/home'}
              title="Refresh Dashboard"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
            
            <button
              type="button"
              onClick={logout}
              className="shrink-0 flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
            >
              <i className="fas fa-sign-out-alt" /> 
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fadeIn"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            'fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-school to-school-dark text-white flex flex-col',
            'transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          {/* Sidebar header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <img 
                src="../../dist/assets/logo.png" 
                alt="Logo" 
                className="w-8 h-8 rounded-full border border-white/50"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="font-bold">Admin Panel</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={!!item.end}
                className={linkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`fas ${item.icon} w-5 text-center`} aria-hidden="true" />
                <span>{item.label}</span>
                {/* Active indicator dot */}
                {location.pathname === item.to && (
                  <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
                )}
              </NavLink>
            ))}
            
            {/* Divider */}
            <div className="my-4 border-t border-white/10"></div>
            
            {/* Additional Links */}
            <NavLink
              to="/modules"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/15 transition-all duration-200"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-map w-5 text-center" /> 
              <span>Module Map</span>
            </NavLink>
            
            {/* Help link (optional) */}
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/15 transition-all duration-200"
              onClick={(e) => {
                e.preventDefault();
                alert('For support, contact: support@school.com');
              }}
            >
              <i className="fas fa-question-circle w-5 text-center" />
              <span>Help & Support</span>
            </a>
          </nav>
          
          {/* Sidebar footer */}
          <div className="p-4 border-t border-white/10 text-xs text-white/60">
            <div className="flex items-center justify-between">
              <span>Version 2.0.0</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-100 to-gray-100">
          {/* Optional: Breadcrumb navigation */}
          <div className="sticky top-[57px] z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-3 hidden sm:block">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="fas fa-home text-school"></i>
              <span>/</span>
              <span className="font-medium text-gray-800 capitalize">
                {location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>
          
          {/* Page content */}
          <div className="flex-1 p-4 md:p-6">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>

      {/* Add animation keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `
      }} />
    </div>
  );
}