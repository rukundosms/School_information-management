import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function AdminYears() {
  const [years, setYears] = useState([]);
  const [error, setError] = useState('');
  const [year, setYear] = useState('');

  const load = () =>
    apiFetch('/api/admin/years-admin')
      .then((d) => setYears(d.years || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/years-admin', { method: 'POST', body: JSON.stringify({ year }) });
      setYear('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete this year?')) return;
    try {
      await apiFetch(`/api/admin/years-admin/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-2">
      <h1 className="text-2xl font-bold text-school">Academic years</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="bg-white rounded-xl shadow p-6">
        <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
          <input className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]" placeholder="e.g. 2025/2026" value={year} onChange={(e) => setYear(e.target.value)} required />
          <button type="submit" className="bg-school text-white font-semibold rounded-lg px-6 py-2 hover:bg-school-dark">
            Add year
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year_id} className="border-t">
                <td className="px-4 py-2">{y.year_id}</td>
                <td className="px-4 py-2">{y.year}</td>
                <td className="px-4 py-2">{y.status || '—'}</td>
                <td className="px-4 py-2">
                  <button type="button" className="text-red-600 font-semibold text-xs" onClick={() => del(y.year_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
