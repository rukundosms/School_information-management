import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function TeacherOnlineClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    apiFetch('/api/teacher/online-classes')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    if (!confirm('Cancel this class?')) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${id}/cancel`, { method: 'POST' });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">Manage online classes</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="space-y-3">
        {classes.map((oc) => (
          <div key={oc.class_id ?? oc.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">{oc.title || 'Session'}</div>
                <div className="text-sm text-gray-600">
                  {oc.class_name} · {oc.scheduled_date} {oc.start_time}–{oc.end_time}
                </div>
                <div className="text-xs text-gray-500 mt-1">Status: {oc.status}</div>
              </div>
              {oc.status !== 'cancelled' ? (
                <button type="button" onClick={() => cancel(oc.class_id)} className="text-red-600 text-sm font-semibold">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
