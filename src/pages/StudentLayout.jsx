import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  [
    'flex items-center gap-3 px-5 py-3 text-white transition border-l-4',
    isActive ? 'bg-school-dark border-amber-400 pl-6' : 'border-transparent hover:bg-school-dark hover:pl-6 hover:border-amber-400',
  ].join(' ');

export default function StudentLayout() {
  const { auth, logout } = useAuth();
  const u = auth?.user;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f5f5f5]">
      <aside className="w-full md:w-[250px] shrink-0 bg-school text-white flex flex-col md:min-h-screen shadow-md z-[1000]">
        <div className="px-5 py-6 text-center border-b border-white/10 mb-5">
          <i className="fas fa-user-circle text-5xl text-white/95 mb-2 block" />
          <h5 className="font-semibold text-base">{u?.name || 'Student'}</h5>
          {u?.reg ? <small className="text-white/75 text-xs block mt-1">{u.reg}</small> : null}
          <div className="mt-3">
            <span className="inline-block rounded-full bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1">{u?.className || 'Class'}</span>
          </div>
        </div>
        <nav className="flex-1 flex flex-col pb-4 md:pb-0">
          <NavLink to="/student/dashboard" className={linkClass} end>
            <i className="fas fa-tachometer-alt w-6 text-center" /> Dashboard
          </NavLink>
          <NavLink to="/student/online-classes" className={linkClass}>
            <i className="fas fa-video w-6 text-center" /> Online Classes
          </NavLink>
          <NavLink to="/student/assessments" className={linkClass}>
            <i className="fas fa-tasks w-6 text-center" /> Assessments
          </NavLink>
          <NavLink to="/student/results" className={linkClass}>
            <i className="fas fa-chart-line w-6 text-center" /> My Results
          </NavLink>
          <NavLink to="/student/attendance" className={linkClass}>
            <i className="fas fa-calendar-check w-6 text-center" /> Attendance
          </NavLink>
          <NavLink to="/student/forum" className={linkClass}>
            <i className="fas fa-comments w-6 text-center" /> Discussion Forum
          </NavLink>
          <NavLink to="/student/announcements" className={linkClass}>
            <i className="fas fa-bullhorn w-6 text-center" /> Announcements
          </NavLink>
          <NavLink to="/student/profile" className={linkClass}>
            <i className="fas fa-user w-6 text-center" /> My Profile
          </NavLink>
          <NavLink to="/student/notifications" className={linkClass}>
            <i className="fas fa-bell w-6 text-center" /> Notifications
          </NavLink>
          <NavLink to="/modules" className={({ isActive }) => `${linkClass({ isActive })} border-t border-white/10 mt-5 pt-2`}>
            <i className="fas fa-map w-6 text-center" /> Module map
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 px-5 py-3 text-left text-white hover:bg-school-dark border-l-4 border-transparent hover:border-amber-400 mt-auto mb-4"
          >
            <i className="fas fa-sign-out-alt w-6 text-center" /> Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-5 md:p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
