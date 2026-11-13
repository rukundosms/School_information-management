// src/pages/teacher/TeacherModuleTerm.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherModuleTerm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cid = searchParams.get('cid');
  const level = searchParams.get('level') || '';
  const className = searchParams.get('className') || '';
  const year = searchParams.get('year');
  const yearLabel = searchParams.get('yearLabel') || year;

  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cid || !year) {
      setLoading(false);
      setError('Missing context. Please start over.');
      return;
    }
    (async () => {
      try {
        const data = await apiFetch(`/api/teacher/mymodule-terms/${year}`);
        setTerms(data.terms || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, year]);

  const handlePickTerm = (term) => {
    const params = new URLSearchParams({
      cid: String(cid),
      level,
      className,
      year: String(year),
      yearLabel: String(yearLabel),
      term: String(term),
    });
    navigate(`/teacher/mymodules?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading terms…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        <div className="text-center mb-6">
          <Link
            to={`/teacher/module-year?cid=${cid}&level=${encodeURIComponent(level)}&className=${encodeURIComponent(className)}`}
            className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Years
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            Choose Term for {yearLabel}
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {!error && terms.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-list-ol text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No terms found</h2>
            <p className="text-gray-500 text-sm">
              No terms found for the selected year.
            </p>
          </div>
        )}

        {terms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {terms.map(t => (
              <button
                key={t}
                onClick={() => handlePickTerm(t)}
                className="bg-green-500 hover:bg-green-600 text-white text-lg font-semibold py-5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Term {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}