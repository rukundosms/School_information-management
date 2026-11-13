import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherUploadMaterials() {
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    cid: '',
    title: '',
    description: '',
    material_type: 'lecture',
    file: null,
  });

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        apiFetch('/api/teacher/mymodule-classes'),
        apiFetch('/api/teacher/materials'),
      ]);
      setClasses(c.classes || []);
      setMaterials(m.materials || []);
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
    if (!form.cid || !form.title || !form.file) {
      setError('Please select a class, enter a title, and choose a file.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('cid', form.cid);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('material_type', form.material_type);
      fd.append('file', form.file);

      const res = await fetch('/api/teacher/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('school_portal_auth') || '{}')?.token || ''}`,
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed');

      setSuccess('Material uploaded successfully!');
      setForm({ cid: '', title: '', description: '', material_type: 'lecture', file: null });
      document.getElementById('material-file-input').value = '';
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await apiFetch(`/api/teacher/materials/${id}`, { method: 'DELETE' });
      setSuccess('Material deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.endsWith('.pdf')) return 'fa-file-pdf';
    if (n.match(/\.docx?$/)) return 'fa-file-word';
    if (n.match(/\.pptx?$/)) return 'fa-file-powerpoint';
    if (n.match(/\.xlsx?$/)) return 'fa-file-excel';
    if (n.match(/\.(jpe?g|png)$/)) return 'fa-file-image';
    if (n.endsWith('.mp4')) return 'fa-file-video';
    if (n.endsWith('.zip')) return 'fa-file-archive';
    return 'fa-file';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
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
            <i className="fas fa-cloud-upload-alt"></i> Upload Study Materials
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

        {/* Upload form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Upload New Material</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Material Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.material_type}
                  onChange={(e) => setForm({ ...form, material_type: e.target.value })}
                  required
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
                >
                  <option value="lecture">Lecture Notes</option>
                  <option value="assignment">Assignment</option>
                  <option value="reading">Reading Material</option>
                  <option value="video">Video</option>
                  <option value="presentation">Presentation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Select File <span className="text-red-500">*</span>
              </label>
              <input
                id="material-file-input"
                type="file"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowed: PDF, DOC, PPT, XLS, JPG, PNG, MP4, ZIP (Max 50MB)
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-800 hover:bg-green-900 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50"
            >
              <i className="fas fa-upload mr-1"></i>
              {submitting ? 'Uploading…' : 'Upload Material'}
            </button>
          </form>
        </div>

        {/* Materials list */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">Uploaded Materials</h2>
        {materials.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-cloud-upload-alt text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-600">No materials uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map(m => (
              <div key={m.material_id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <i className={`fas ${getIcon(m.file_name)} text-3xl text-green-800`}></i>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-bold text-gray-800">{m.title}</h3>
                    <p className="text-sm text-gray-600">
                      <i className="fas fa-chalkboard mr-1"></i>{m.class_name}
                    </p>
                    {m.description && (
                      <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div><i className="fas fa-tag mr-1"></i>{m.material_type}</div>
                    <div><i className="far fa-clock mr-1"></i>{new Date(m.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/${m.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-green-800 hover:bg-green-900 text-white text-sm px-4 py-2 rounded-lg font-semibold"
                    >
                      <i className="fas fa-download mr-1"></i> Download
                    </a>
                    <button
                      onClick={() => handleDelete(m.material_id)}
                      className="border border-red-500 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-semibold"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}