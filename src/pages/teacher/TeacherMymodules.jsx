// src/pages/teacher/TeacherMymodules.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherMymodules() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cid = searchParams.get('cid');
  const term = searchParams.get('term') || '';
  const year = searchParams.get('year') || '';
  const yearLabel = searchParams.get('yearLabel') || year;

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cid || !term || !year) {
      setLoading(false);
      setError('Missing context. Please start over from Choose Class.');
      return;
    }
    (async () => {
      try {
        const data = await apiFetch(`/api/teacher/mymodules/${cid}`);
        setModules(data.modules || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, term, year]);

  const handlePickModule = (mod) => {
    const params = new URLSearchParams({
      cid: String(cid),
      mid: String(mod.moid),
      name: mod.mname,
      term: String(term),
      year: String(year),
      yearLabel: String(yearLabel),
    });
    navigate(`/teacher/list?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        <div className="text-center mb-6">
          <Link
            to={`/teacher/module-term?cid=${cid}&year=${year}&yearLabel=${encodeURIComponent(yearLabel)}`}
            className="text-sm font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Terms
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Choose Module</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 mb-5 text-center font-semibold">
          Term {term} – {yearLabel}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {!error && modules.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-book text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No modules available</h2>
            <p className="text-gray-500 text-sm">
              No modules assigned to you for this class.
            </p>
          </div>
        )}

        {modules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => (
              <button
                key={mod.moid}
                onClick={() => handlePickModule(mod)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold py-4 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {mod.mname}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}