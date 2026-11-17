import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ class: '', mname: '', mcode: '', module_type: 'general', credit: '0' });

  const load = () => {
    apiFetch('/api/admin/modules-admin')
      .then((d) => setModules(d.modules || []))
      .catch((e) => setError(e.message));
    apiFetch('/api/admin/classes-admin')
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/modules-admin', {
        method: 'POST',
        body: JSON.stringify({ ...form, class: parseInt(form.class, 10) }),
      });
      setForm({ class: '', mname: '', mcode: '', module_type: 'general', credit: '0' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete module?')) return;
    try {
      await apiFetch(`/api/admin/modules-admin/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-2">
      <h1 className="text-2xl font-bold text-school">Modules</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <form onSubmit={add} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">Class</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required>
              <option value="">Select</option>
              {classes.map((c) => (
                <option key={c.cid} value={c.cid}>
                  {c.level}
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Name</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.mname} onChange={(e) => setForm({ ...form, mname: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Code</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.mcode} onChange={(e) => setForm({ ...form, mcode: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Type</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.module_type} onChange={(e) => setForm({ ...form, module_type: e.target.value })}>
              <option value="complementary">Complementary</option>
              <option value="general">General</option>
              <option value="specific">Specific</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Credit</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-school text-white font-semibold rounded-lg py-2 hover:bg-school-dark">
              Add module
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.moid} className="border-t">
                <td className="px-4 py-2">{m.mname}</td>
                <td className="px-4 py-2">{m.mcode}</td>
                <td className="px-4 py-2">
                  {m.level}
                  {m.class_name}
                </td>
                <td className="px-4 py-2">
                  <button type="button" className="text-red-600 font-semibold text-xs" onClick={() => del(m.moid)}>
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
