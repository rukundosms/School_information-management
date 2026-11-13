import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function StudentAttendance() {
  const [data, setData] = useState({ records: [], monthly: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/attendance')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-school">Attendance</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="bg-gradient-to-br from-school to-school-dark text-white rounded-xl p-6">
        <h2 className="font-semibold mb-3">Monthly summary</h2>
        <div className="space-y-2 text-sm">
          {(data.monthly || []).map((m) => (
            <div key={m.month} className="flex justify-between border-b border-white/20 pb-2">
              <span>{m.month}</span>
              <span>
                P {m.present} · A {m.absent} · L {m.late}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Session</th>
            </tr>
          </thead>
          <tbody>
            {(data.records || []).map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{r.class_date}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">{r.class_title || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
