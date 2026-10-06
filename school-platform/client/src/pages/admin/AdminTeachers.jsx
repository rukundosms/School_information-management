import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ fname: '', lname: '', tcode: '' });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () =>
    apiFetch('/api/admin/teachers')
      .then((d) => setTeachers(d.teachers || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  async function add(e) {
    e.preventDefault();
    if (!form.fname.trim() || !form.lname.trim() || !form.tcode.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (editMode) {
        // Update existing teacher
        await apiFetch(`/api/admin/teachers/${editId}`, { 
          method: 'PUT', 
          body: JSON.stringify(form) 
        });
        setSuccess('Teacher updated successfully!');
        setEditMode(false);
        setEditId(null);
      } else {
        // Add new teacher
        await apiFetch('/api/admin/teachers', { method: 'POST', body: JSON.stringify(form) });
        setSuccess('Teacher added successfully!');
      }
      setForm({ fname: '', lname: '', tcode: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function del(tid) {
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      await apiFetch(`/api/admin/teachers/${tid}`, { method: 'DELETE' });
      setSuccess('Teacher deleted successfully!');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function editTeacher(teacher) {
    setForm({
      fname: teacher.fname,
      lname: teacher.lname,
      tcode: teacher.tcode
    });
    setEditMode(true);
    setEditId(teacher.tid);
    setError('');
    // Scroll to form
    document.getElementById('teacher-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditMode(false);
    setEditId(null);
    setForm({ fname: '', lname: '', tcode: '' });
    setError('');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <h1 className="text-3xl font-bold text-school">Teacher Management</h1>
      
      {/* Success Message */}
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <i className="fas fa-check-circle text-green-500"></i>
            <span>{success}</span>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-red-500"></i>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Add/Edit Teacher Form */}
      <div className="bg-white rounded-xl shadow-lg p-6" id="teacher-form">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {editMode ? 'Edit Teacher' : 'Add New Teacher'}
          </h2>
          {editMode && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Cancel Edit
            </button>
          )}
        </div>
        
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school focus:border-transparent transition"
              value={form.fname} 
              onChange={(e) => setForm({ ...form, fname: e.target.value })} 
              required 
              placeholder="Enter first name"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school focus:border-transparent transition"
              value={form.lname} 
              onChange={(e) => setForm({ ...form, lname: e.target.value })} 
              required 
              placeholder="Enter last name"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Teacher Code <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school focus:border-transparent transition"
              value={form.tcode} 
              onChange={(e) => setForm({ ...form, tcode: e.target.value })} 
              required 
              placeholder="Enter teacher code"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2 items-end">
            <button 
              type="submit" 
              className={`w-full font-semibold rounded-lg py-2 transition ${
                editMode 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-school hover:bg-school-dark text-white'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  {editMode ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className={`fas ${editMode ? 'fa-edit' : 'fa-plus'}`}></i>
                  {editMode ? 'Update Teacher' : 'Add Teacher'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Teachers List Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Registered Teachers</h2>
          <p className="text-sm text-gray-500">Total: {teachers.length} teachers</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Teacher Code</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">First Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Last Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Full Name</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    <i className="fas fa-user-graduate text-4xl mb-2 block"></i>
                    No teachers found. Add your first teacher above.
                  </td>
                </tr>
              ) : (
                teachers.map((t, i) => (
                  <tr key={t.tid} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3 font-mono text-sm font-medium text-gray-800">{t.tcode}</td>
                    <td className="px-6 py-3 text-gray-700">{t.fname}</td>
                    <td className="px-6 py-3 text-gray-700">{t.lname}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{t.fname} {t.lname}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button 
                          type="button" 
                          onClick={() => editTeacher(t)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all hover:scale-105"
                          title="Edit Teacher"
                        >
                          <i className="fas fa-edit text-xs"></i>
                          Edit
                        </button>
                        <button 
                          type="button" 
                          onClick={() => del(t.tid)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all hover:scale-105"
                          title="Delete Teacher"
                        >
                          <i className="fas fa-trash text-xs"></i>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        {teachers.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Showing {teachers.length} teacher(s)</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}