// src/pages/teacher/TeacherModuleYear.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherModuleYear() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cid = searchParams.get('cid');
  const level = searchParams.get('level') || '';
  const className = searchParams.get('className') || '';

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cid) {
      setLoading(false);
      setError('No class selected.');
      return;
    }
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/mymodule-years');
        setYears(data.years || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid]);

  const handlePickYear = (yearRow) => {
    const params = new URLSearchParams({
      cid: String(cid),
      level,
      className,
      year: String(yearRow.marks_year_id),
      yearLabel: yearRow.academic_year || String(yearRow.marks_year_id),
    });
    navigate(`/teacher/module-term?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading years…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        <div className="text-center mb-6">
          <Link
            to="/teacher/mymodule"
            className="text-sm font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Classes
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Choose Year</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {level && className ? `${level} ${className}` : 'Select an academic year'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {!error && years.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-calendar text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No marks entered</h2>
            <p className="text-gray-500 text-sm">
              You have not entered any marks for this class yet.
            </p>
          </div>
        )}

        {years.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {years.map(y => (
              <button
                key={y.marks_year_id}
                onClick={() => handlePickYear(y)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold py-5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {y.marks_year_id} – {y.academic_year}
                {y.status === 'active' && (
                  <span className="block text-xs mt-1 opacity-75">(Active)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}