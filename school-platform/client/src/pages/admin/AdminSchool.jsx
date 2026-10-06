import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function AdminSchool() {
  const [school, setSchool] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/school-admin')
      .then((d) => setSchool(d.school || {}))
      .catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await apiFetch('/api/admin/school-admin', { method: 'PATCH', body: JSON.stringify(school) });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!school) {
    return (
      <div className="p-6 flex justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const fields = [
    ['school_name', 'School name'],
    ['code', 'Code'],
    ['email', 'Email'],
    ['country', 'Country'],
    ['phone', 'Phone'],
    ['secter', 'Sector'],
    ['district', 'District'],
    ['provence', 'Province'],
  ];

  return (
    <div className="max-w-xl mx-auto p-2">
      <h1 className="text-2xl font-bold text-school mb-6">School</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm mb-4">{error}</div> : null}
      {saved ? <div className="rounded-lg bg-green-50 text-green-800 px-4 py-2 text-sm mb-4">Saved.</div> : null}
      <form onSubmit={save} className="bg-white rounded-xl shadow p-6 space-y-4">
        {fields.map(([key, label]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-gray-600">{label}</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={school[key] ?? ''} onChange={(e) => setSchool({ ...school, [key]: e.target.value })} />
          </div>
        ))}
        <button type="submit" className="w-full bg-school text-white font-semibold rounded-lg py-2 hover:bg-school-dark">
          Update school
        </button>
      </form>
    </div>
  );
}
