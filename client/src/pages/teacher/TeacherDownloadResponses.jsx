// src/pages/teacher/TeacherDownloadResponses.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, API_BASE } from '../../api/client';

export default function TeacherDownloadResponses() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/download-assessments');
        setAssessments(data.assessments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getAuthToken = () => {
    try {
      return JSON.parse(localStorage.getItem('school_portal_auth') || '{}')?.token;
    } catch {
      return null;
    }
  };

  // Extract filename from Content-Disposition header, fallback to default
  const getFilename = (res, fallback) => {
    const cd = res.headers.get('Content-Disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    return match ? decodeURIComponent(match[1]) : fallback;
  };

  // ✅ Fetch HTML using token + correct API base, convert to Blob, open in new tab
  const openPaper = async (assessmentId, studentId = null) => {
    setDownloading(`paper-${assessmentId}-${studentId || 'all'}`);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) throw new Error('Session expired. Please log in again.');

      const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
      const url = `${API_BASE}/api/teacher/download-answers/${assessmentId}/paper${qs}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to load paper';
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errBody = await res.json().catch(() => ({}));
          message = errBody.error || message;
        } else {
          const text = await res.text().catch(() => '');
          // Avoid dumping full HTML error pages; keep it short
          if (text && text.length < 200) message = text;
        }
        throw new Error(`${message} (HTTP ${res.status})`);
      }

      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        // Pop-up blocked — fall back to download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = getFilename(res, `assessment_${assessmentId}_paper.html`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err.message || 'Failed to load paper');
    } finally {
      setDownloading(null);
    }
  };

  // ✅ Fetch Excel using token + correct API base, trigger download
  const downloadExcel = async (assessmentId) => {
    setDownloading(`excel-${assessmentId}`);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) throw new Error('Session expired. Please log in again.');

      const url = `${API_BASE}/api/teacher/download-answers/${assessmentId}/excel`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let message = 'Failed to download Excel';
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errBody = await res.json().catch(() => ({}));
          message = errBody.error || message;
        } else {
          const text = await res.text().catch(() => '');
          if (text && text.length < 200) message = text;
        }
        throw new Error(`${message} (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = getFilename(res, `assessment_${assessmentId}_answers.xls`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
      <div className="max-w-6xl mx-auto">
{/* Header with School and RTB Logos */}
<div className="bg-white rounded-xl shadow-lg p-6 mb-6">

  <div className="flex items-start justify-between gap-3">
    {/* LEFT: School Logo */}
    <div className="flex-shrink-0">
      <img
        src="/logo.jpg"
        alt="School Logo"
        className="w-16 h-16 md:w-24 md:h-24 object-contain"
      />
    </div>
    {/* CENTER: Page Information */}
    <div className="flex-1 text-center">
      <Link
        to="/teacher/dashboard"
        className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2"
      >
        <i className="fas fa-arrow-left"></i>
        Back to Dashboard
      </Link>
      <h1 className="text-xl md:text-3xl font-bold text-green-900">
        <i className="fas fa-download"></i>
        Download Student Answers
      </h1>
      <p className="text-gray-600 mt-2 text-xs md:text-sm">
        Download answered papers for each assessment — print-ready for portfolios
      </p>
    </div>
    {/* RIGHT: RTB Logo */}
    <div className="flex-shrink-0">
      <img
        src="/rtb.png"
        alt="RTB Logo"
        className="w-16 h-16 md:w-24 md:h-24 object-contain"
      />
    </div>
  </div>
</div>
        {/* Alerts */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold text-xl">×</button>
          </div>
        )}

        {/* Empty state */}
        {assessments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-download text-5xl text-gray-300 mb-4 block"></i>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Assessments Available</h4>
            <p className="text-gray-500 mb-6">Create assessments first to download student responses.</p>
            <Link
              to="/teacher/create-assessment"
              className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Create Assessment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map(a => (
              <div
                key={a.assessment_id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 h-full flex flex-col"
              >
                <h5 className="text-lg font-bold text-gray-800 mb-2">{a.title}</h5>
                <p className="text-sm text-gray-600 mb-3">
                  <i className="fas fa-chalkboard mr-1"></i> {a.class_name}
                </p>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <div><i className="fas fa-question-circle mr-2 text-green-800"></i>Questions: {a.total_questions}</div>
                  <div><i className="fas fa-users mr-2 text-green-800"></i>Submissions: {a.total_submissions}</div>
                  <div><i className="fas fa-star mr-2 text-green-800"></i>Total Marks: {a.total_marks}</div>
                  <div><i className="fas fa-calendar mr-2 text-green-800"></i>Created: {new Date(a.created_at).toLocaleDateString()}</div>
                </div>

                {/* Download All buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => openPaper(a.assessment_id)}
                    disabled={a.total_submissions === 0 || downloading === `paper-${a.assessment_id}-all`}
                    className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {downloading === `paper-${a.assessment_id}-all` ? (
                      <><i className="fas fa-spinner fa-spin"></i> Loading...</>
                    ) : (
                      <><i className="fas fa-file-pdf"></i> All PDF</>
                    )}
                  </button>
                  <button
                    onClick={() => downloadExcel(a.assessment_id)}
                    disabled={a.total_submissions === 0 || downloading === `excel-${a.assessment_id}`}
                    className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {downloading === `excel-${a.assessment_id}` ? (
                      <><i className="fas fa-spinner fa-spin"></i> Loading...</>
                    ) : (
                      <><i className="fas fa-file-excel"></i> All Excel</>
                    )}
                  </button>
                </div>

                {/* Individual students */}
                {a.students && a.students.length > 0 && (
                  <div className="border-t pt-3 mt-2">
                    <p className="text-xs text-gray-500 mb-2">
                      <i className="fas fa-user-graduate mr-1"></i>
                      Individual Student Papers
                      <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-2">
                        {a.students.length}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {a.students.map(s => {
                        const key = `paper-${a.assessment_id}-${s.sid}`;
                        return (
                          <button
                            key={s.sid}
                            onClick={() => openPaper(a.assessment_id, s.sid)}
                            disabled={downloading === key}
                            className="bg-gray-100 hover:bg-blue-100 text-xs px-2 py-1 rounded-full transition flex items-center gap-1 disabled:opacity-50"
                            title={`Download ${s.firstname} ${s.lastname}'s paper`}
                          >
                            {downloading === key ? (
                              <><i className="fas fa-spinner fa-spin text-gray-500"></i> Loading</>
                            ) : (
                              <>
                                <i className="fas fa-file-pdf text-red-600"></i>
                                {s.firstname} {s.lastname}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {a.total_submissions === 0 && (
                  <p className="text-xs text-gray-400 italic mt-2">
                    No submissions yet
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}