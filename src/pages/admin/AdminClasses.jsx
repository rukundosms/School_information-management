import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ level: '', class_code: '', class_name: '' });

  const load = () =>
    apiFetch('/api/admin/classes-admin')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/classes-admin', { method: 'POST', body: JSON.stringify(form) });
      setForm({ level: '', class_code: '', class_name: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function del(cid) {
    if (!confirm('Delete this class?')) return;
    try {
      await apiFetch(`/api/admin/classes-admin/${cid}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-2">
      <h1 className="text-2xl font-bold text-school">Classes / levels</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Add level</h2>
        <form onSubmit={add} className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-600">Level</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Code</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.class_code} onChange={(e) => setForm({ ...form, class_code: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Display name (opt.)</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
          </div>
          <button type="submit" className="bg-school text-white font-semibold rounded-lg py-2 hover:bg-school-dark">
            Add
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Level + class</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.cid} className="border-t">
                <td className="px-4 py-2">{c.cid}</td>
                <td className="px-4 py-2">
                  {c.level} {c.class_name || ''}
                </td>
                <td className="px-4 py-2">{c.class_code}</td>
                <td className="px-4 py-2">
                  <button type="button" className="text-red-600 font-semibold text-xs" onClick={() => del(c.cid)}>
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
