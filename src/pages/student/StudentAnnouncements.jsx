import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function StudentAnnouncements() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/announcements')
      .then((d) => setRows(d.announcements || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">Announcements</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="space-y-4">
        {rows.map((a, i) => (
          <div key={a.id ?? a.announcement_id ?? i} className={`rounded-xl shadow p-5 ${a.important ? 'bg-amber-50 border-2 border-amber-300' : 'bg-white border border-gray-100'}`}>
            <div className="font-bold text-school">{a.title}</div>
            <div className="text-xs text-gray-500 mt-1">
              {a.fname} {a.lname}
            </div>
            <p className="text-sm mt-3 whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
