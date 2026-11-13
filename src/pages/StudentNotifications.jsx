import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function StudentNotifications() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [error, setError] = useState('');

  const load = () =>
    apiFetch('/api/student/notifications')
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    try {
      await apiFetch(`/api/student/notifications/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="alert-error">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-school mb-2">Notifications</h1>
      <p className="text-sm text-gray-600 mb-4">Unread: {data.unread}</p>
      <div className="space-y-3">
        {(data.notifications || []).map((n) => (
          <div key={n.notification_id} className="card flex justify-between gap-4 items-start">
            <div>
              <div className="font-semibold">{n.title}</div>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              <div className="text-xs text-gray-400 mt-2">{n.created_at}</div>
            </div>
            <button type="button" className="text-red-600 text-sm font-semibold shrink-0" onClick={() => remove(n.notification_id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
