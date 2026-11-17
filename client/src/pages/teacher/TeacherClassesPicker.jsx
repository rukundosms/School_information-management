// src/pages/teacher/TeacherClassesPicker.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherClassesPicker() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/teacher-classes');
        setClasses(data.classes || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePickClass = (cls) => {
    // PHP set $_SESSION['cl'] and $_SESSION['level'] then redirected to modules.php
    // In React, we just navigate with the class info as URL params
    navigate(`/teacher/modules?cid=${cls.cid}&level=${encodeURIComponent(cls.level || '')}`);
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
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <Link
            to="/teacher/dashboard"
            className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Choose Class</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a class to view its modules</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* No permission */}
        {!error && classes.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-chalkboard text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No class you are permitted</h2>
            <p className="text-gray-500 text-sm">
              Ask the administrator to grant you access to a class.
            </p>
          </div>
        )}

        {/* Class grid */}
        {classes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <button
                key={cls.cid}
                onClick={() => handlePickClass(cls)}
                className="bg-white text-black text-xl font-semibold py-6 px-4 rounded-lg shadow-md hover:bg-green-50 hover:shadow-lg transition-all border border-green-100 flex flex-col items-center gap-2"
              >
                <i className="fas fa-chalkboard-teacher text-2xl text-green-800"></i>
                <span>{cls.level}{cls.class_name}</span>
                {cls.class_code && (
                  <span className="text-xs text-gray-500 font-normal">{cls.class_code}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <i className="fas fa-info-circle mr-1"></i>
          You will be redirected to the modules page for the selected class.
        </div>
      </div>
    </div>
  );
}