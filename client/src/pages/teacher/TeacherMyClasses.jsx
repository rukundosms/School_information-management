import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function TeacherMyClasses() {
  const [data, setData] = useState({ classes: [], yearId: null });
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teacher/my-classes')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">My classes</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="grid gap-4">
        {(data.classes || []).map((c) => (
          <div key={c.cid} className="bg-white rounded-xl shadow border-l-4 border-school p-5 flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-bold text-lg text-school">
                {c.class_name} <span className="text-gray-500 font-normal text-sm">({c.class_code})</span>
              </div>
              <div className="text-sm text-gray-600">Level {c.level}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-school">{c.student_count ?? 0}</div>
              <div className="text-xs text-gray-500">Students</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
