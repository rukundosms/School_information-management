// src/pages/teacher/TeacherDiscussionForum.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherDiscussionForum() {
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ cid: '', title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [f, c] = await Promise.all([
        apiFetch('/api/teacher/forums'),
        apiFetch('/api/teacher/forum-classes'),
      ]);
      setForums(f.forums || []);
      setClasses(c.classes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cid || !form.title) {
      setError('Please select a class and enter a title.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/teacher/forums', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess('Forum created successfully!');
      setForm({ cid: '', title: '', description: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forums…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
            <i className="fas fa-comments"></i> Discussion Forums
          </h1>
        </div>

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-lg mb-4">
            <i className="fas fa-check-circle mr-2"></i>{success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        {/* Create Forum Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create New Discussion Forum</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Select Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.cid}
                onChange={(e) => setForm({ ...form, cid: e.target.value })}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.cid} value={c.cid}>{c.class_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Forum Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-800 hover:bg-green-900 text-white px-5 py-2.5 rounded-lg font-semibold disabled:opacity-50"
            >
              <i className="fas fa-plus-circle mr-1"></i>
              {submitting ? 'Creating…' : 'Create Forum'}
            </button>
          </form>
        </div>

        {/* Forums list */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">Active Forums</h2>
        {forums.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-comments text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-600">No discussion forums created yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forums.map(f => (
              <div key={f.forum_id} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex-1 min-w-[250px]">
                    <h3 className="text-base font-bold text-green-900">{f.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <i className="fas fa-chalkboard mr-1"></i>{f.class_name}
                    </p>
                    {f.description && (
                      <p className="text-sm text-gray-500 mt-1">{f.description}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div><i className="fas fa-comments mr-1"></i>Topics: {f.topic_count}</div>
                    <div><i className="far fa-clock mr-1"></i>Created: {new Date(f.created_at).toLocaleDateString()}</div>
                  </div>
                  <Link
                    to={`/teacher/forum/${f.forum_id}`}
                    className="bg-green-800 hover:bg-green-900 text-white text-sm px-4 py-2 rounded-lg font-semibold"
                  >
                    <i className="fas fa-eye mr-1"></i> View Forum
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}