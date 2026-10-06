// src/pages/teacher/TeacherViewResults.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherViewResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/view-results');
        setResults(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results…</p>
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
            <i className="fas fa-chart-bar"></i> Assessment Results
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        {results.length === 0 && !error ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-chart-bar text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-600">No completed assessments with results yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(r => (
              <div key={r.assessment_id} className="bg-white rounded-xl shadow-md p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-bold text-gray-800">{r.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      <i className="fas fa-chalkboard mr-1"></i>{r.class_name}
                      <br />
                      <i className="fas fa-star mr-1"></i>Total: {r.total_marks} marks
                    </p>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatBox value={r.total_submissions} label="Submissions" />
                    <StatBox value={Number(r.average_marks || 0).toFixed(2)} label="Average" />
                    <StatBox value={r.min_marks ?? 0} label="Minimum" />
                    <StatBox value={r.max_marks ?? 0} label="Maximum" />
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <Link
                    to={`/teacher/assessment-reports?assessment=${r.assessment_id}`}
                    className="inline-block bg-green-800 hover:bg-green-900 text-white text-sm px-4 py-2 rounded-lg font-semibold"
                  >
                    <i className="fas fa-chart-line mr-1"></i> View Detailed Report
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

function StatBox({ value, label }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-green-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}