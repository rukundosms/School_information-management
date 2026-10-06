// src/pages/teacher/TeacherMymodule.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherMymodule() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/mymodule-classes');
        setClasses(data.classes || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePickClass = (cls) => {
    const params = new URLSearchParams({
      cid: String(cls.cid),
      level: cls.level || '',
      className: cls.class_name || '',
    });
    navigate(`/teacher/module-year?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        <div className="text-center mb-6">
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Choose Class</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a class to proceed</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {!error && classes.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-chalkboard text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No classes available</h2>
            <p className="text-gray-500 text-sm">You have no permitted classes.</p>
          </div>
        )}

        {classes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <button
                key={cls.cid}
                onClick={() => handlePickClass(cls)}
                className="bg-green-500 hover:bg-green-600 text-white text-lg font-semibold py-5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {cls.level} {cls.class_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}