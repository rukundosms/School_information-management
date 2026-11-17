import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DodShell() {
  const { auth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <header className="h-14 shrink-0 bg-school text-white flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" className="md:hidden p-2 rounded hover:bg-white/10" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            <i className="fas fa-bars" />
          </button>
          <div className="truncate">
            <span className="font-bold block leading-tight">DoD — marks</span>
            <span className="text-xs text-white/80 truncate block">{auth?.user?.username}</span>
          </div>
        </div>
        <button type="button" onClick={logout} className="text-sm font-semibold bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg">
          <i className="fas fa-sign-out-alt mr-1" /> Logout
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {open ? <button type="button" className="fixed inset-0 bg-black/40 z-30 md:hidden" aria-label="Close" onClick={() => setOpen(false)} /> : null}
        <aside
          className={`w-56 shrink-0 bg-school text-white border-r border-white/10 py-4 z-40 fixed md:static top-14 md:top-auto h-[calc(100vh-3.5rem)] md:h-auto transition-transform md:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <NavLink
            to="/dod"
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-l-4 block ${isActive ? 'bg-black/20 border-amber-400' : 'border-transparent hover:bg-white/10'}`
            }
          >
            <i className="fas fa-layer-group w-6 inline-block" /> Choose class
          </NavLink>
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 md:ml-0" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
