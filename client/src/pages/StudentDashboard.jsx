import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/me')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>;
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <div className="spinner" />
      </div>
    );
  }

  const { stats, recentAssessments, profile } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-school mt-0">Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">
            Reg: <strong>{profile.reg}</strong> · Class: <strong>{profile.class_name || profile.className}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/student/notifications" className="inline-flex items-center gap-2 rounded-lg border-2 border-school px-4 py-2 text-sm font-semibold text-school hover:bg-school hover:text-white">
            <i className="fas fa-bell" /> Notifications
          </Link>
          <Link to="/student/online-classes" className="inline-flex items-center gap-2 rounded-lg bg-school px-4 py-2 text-sm font-semibold text-white hover:bg-school-dark">
            <i className="fas fa-video" /> Online classes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          [stats.totalAssessments, 'Published assessments', 'fa-file-alt'],
          [stats.completed, 'Graded', 'fa-check-circle'],
          [stats.pending, 'Pending', 'fa-hourglass-half'],
          [stats.upcomingClasses, 'Upcoming classes', 'fa-video'],
        ].map(([v, l, icon]) => (
          <div key={l} className="rounded-xl bg-white p-5 shadow-md border border-gray-100">
            <i className={`fas ${icon} text-2xl text-school mb-2 block`} />
            <div className="text-2xl font-bold text-school">{v}</div>
            <div className="text-gray-600 text-sm mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-school text-white px-5 py-3 font-bold">
          <i className="fas fa-tasks mr-2" /> Recent assessments
        </div>
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-gray-600 text-left">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Marks</th>
              </tr>
            </thead>
            <tbody>
              {(recentAssessments || []).map((a) => (
                <tr key={a.assessment_id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{a.title}</td>
                  <td className="py-2 pr-4">{a.submission_status || '—'}</td>
                  <td className="py-2">{a.obtained_marks != null ? a.obtained_marks : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Link to="/student/assessments" className="text-sm font-semibold text-school-bright hover:underline">
            View all assessments →
          </Link>
        </div>
      </div>
    </div>
  );
}
