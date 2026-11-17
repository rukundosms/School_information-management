// src/pages/teacher/TeacherManageAssessments.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import AssessmentRequestsWidget from './AssessmentRequestsWidget';

export default function TeacherManageAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const pollRef = useRef(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/api/teacher/manage-assessments');
      setAssessments(data.assessments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    let list = [...assessments];
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.class_name || '').toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [assessments, statusFilter, search]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ============ DELETE ============
  const handleDelete = async (id) => {
    if (!confirm('Delete this assessment? This will also delete all questions and submissions. This cannot be undone.')) return;
    setDeletingId(id);
    setError('');
    try {
      await apiFetch(`/api/teacher/assessments/${id}`, { method: 'DELETE' });
      setSuccess('Assessment deleted');
      await load(true);
    } catch (err) {
      setError(err.message || 'Failed to delete assessment');
    } finally {
      setDeletingId(null);
    }
  };

  // ============ PUBLISH ============
  const handlePublish = async (id) => {
    setPublishingId(id);
    setError('');
    try {
      await apiFetch(`/api/teacher/assessments/${id}/publish`, { method: 'PUT' });
      setSuccess('Assessment published!');
      await load(true);
    } catch (err) {
      setError(err.message || 'Failed to publish assessment');
    } finally {
      setPublishingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      published: 'bg-green-100 text-green-800 border border-green-300',
      completed: 'bg-blue-100 text-blue-800 border border-blue-300',
      archived: 'bg-gray-100 text-gray-700 border border-gray-300',
    };
    const labels = {
      draft: '📝 Draft',
      published: '✅ Published',
      completed: '🏁 Completed',
      archived: '📦 Archived',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = {
    total: assessments.length,
    published: assessments.filter((a) => a.status === 'published').length,
    drafts: assessments.filter((a) => a.status === 'draft').length,
    totalSubmissions: assessments.reduce((sum, a) => sum + (parseInt(a.submission_count) || 0), 0),
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline mb-2 block">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900">Manage Assessments</h1>
          <p className="text-gray-600 mt-1">Create, edit, publish, and grade assessments.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowRequests((s) => !s)}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
              showRequests
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            <i className="fas fa-bell"></i> Requests
          </button>
          <Link
            to="/teacher/create-assessment"
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> New Assessment
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center justify-between">
          <span><i className="fas fa-exclamation-circle mr-2"></i>{error}</span>
          <button onClick={() => setError('')} className="font-bold text-xl">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-4 flex items-center justify-between">
          <span><i className="fas fa-check-circle mr-2"></i>{success}</span>
          <button onClick={() => setSuccess('')} className="font-bold text-xl">×</button>
        </div>
      )}

      {showRequests && (
        <div className="mb-6">
          <AssessmentRequestsWidget />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="fa-file-alt" label="Total" value={stats.total} color="blue" />
        <StatCard icon="fa-check-circle" label="Published" value={stats.published} color="green" />
        <StatCard icon="fa-pencil-ruler" label="Drafts" value={stats.drafts} color="yellow" />
        <StatCard icon="fa-inbox" label="Submissions" value={stats.totalSubmissions} color="purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'published', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                statusFilter === s ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by title or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
          <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
          <p>Loading assessments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <i className="fas fa-file-alt text-5xl text-gray-300 mb-4 block"></i>
          <p className="text-gray-600 text-lg mb-4">
            {assessments.length === 0
              ? "You haven't created any assessments yet."
              : 'No assessments match your filter.'}
          </p>
          {assessments.length === 0 && (
            <Link
              to="/teacher/create-assessment"
              className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold"
            >
              <i className="fas fa-plus"></i> Create Your First Assessment
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.assessment_id} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1 min-w-[250px]">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-800">{a.title}</h3>
                    {getStatusBadge(a.status)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>
                      <i className="fas fa-chalkboard text-green-700 mr-1"></i>
                      {a.class_name} {a.class_code && `(${a.class_code})`}
                    </span>
                    <span>
                      <i className="fas fa-star text-green-700 mr-1"></i>
                      {a.total_marks} marks
                    </span>
                    <span>
                      <i className="fas fa-tag text-green-700 mr-1"></i>
                      {a.assessment_type || 'quiz'}
                    </span>
                    <span>
                      <i className="fas fa-inbox text-green-700 mr-1"></i>
                      {a.submission_count || 0} submission{(a.submission_count || 0) !== 1 ? 's' : ''}
                    </span>
                    <span>
                      <i className="far fa-calendar text-green-700 mr-1"></i>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 min-w-[200px]">
                  <Link
                    to={`/teacher/assessments/${a.assessment_id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-edit"></i> Edit
                  </Link>

                  {a.status === 'draft' ? (
                    <button
                      onClick={() => handlePublish(a.assessment_id)}
                      disabled={publishingId === a.assessment_id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {publishingId === a.assessment_id ? (
                        <><i className="fas fa-spinner fa-spin"></i> Publishing...</>
                      ) : (
                        <><i className="fas fa-paper-plane"></i> Publish</>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={`/teacher/assessments/${a.assessment_id}/grade`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-check-double"></i> Grade
                    </Link>
                  )}

                  <button
                    onClick={() => handleDelete(a.assessment_id)}
                    disabled={deletingId === a.assessment_id}
                    className="border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deletingId === a.assessment_id ? (
                      <><i className="fas fa-spinner fa-spin"></i> Deleting...</>
                    ) : (
                      <><i className="fas fa-trash"></i> Delete</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-xl border ${colorMap[color]} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/50`}>
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-semibold opacity-80">{label}</p>
      </div>
    </div>
  );
}