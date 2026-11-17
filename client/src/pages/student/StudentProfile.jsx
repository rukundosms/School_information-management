import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function StudentProfile() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/profile')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div>;
  if (!data?.profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  const p = data.profile;
  const s = data.session;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-8 border-t-4 border-amber-400">
      <h1 className="text-2xl font-bold text-school mb-6">My profile</h1>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Name</dt>
          <dd className="font-semibold">{s?.name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Registration</dt>
          <dd className="font-semibold">{p.reg || s?.reg}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Class</dt>
          <dd className="font-semibold">
            {p.class_name} ({p.class_code})
          </dd>
        </div>
      </dl>
    </div>
  );
}
