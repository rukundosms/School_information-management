import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function TeacherAnnouncements() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teacher/announcements')
      .then((d) => setRows(d.announcements || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">Announcements</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="space-y-3">
        {rows.map((a, i) => (
          <div key={a.id ?? a.announcement_id ?? i} className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-400">
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm text-gray-600 mt-1">{a.class_name}</div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
