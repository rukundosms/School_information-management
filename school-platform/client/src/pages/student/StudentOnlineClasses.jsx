import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function StudentOnlineClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/online-classes')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">Online classes</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="space-y-4">
        {classes.map((oc, idx) => (
          <div key={oc.class_id ?? oc.id ?? idx} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
            <div className="font-bold text-school">{oc.title || 'Class session'}</div>
            <div className="text-sm text-gray-600 mt-1">
              {oc.scheduled_date} · {oc.start_time} – {oc.end_time}
            </div>
            <div className="text-sm mt-2">
              Teacher: {oc.fname} {oc.lname}
            </div>
            {oc.meeting_link ? (
              <a href={oc.meeting_link} target="_blank" rel="noreferrer" className="inline-block mt-3 rounded-lg bg-school text-white text-sm font-semibold px-4 py-2 hover:bg-school-dark">
                Open meeting
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
