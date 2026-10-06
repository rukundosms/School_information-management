// src/pages/teacher/TeacherModulesPicker.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherModulesPicker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cid = searchParams.get('cid');
  const level = searchParams.get('level') || '';

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cid) {
      setLoading(false);
      setError('No class selected. Please pick a class first.');
      return;
    }

    (async () => {
      try {
        const data = await apiFetch(`/api/teacher/teacher-modules/${cid}`);
        setModules(data.modules || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid]);

  const handlePickModule = (mod) => {
    // PHP stored $_SESSION['module'] and $_SESSION['name'], then redirected to marks.php
    // In React, we pass them via URL params
    navigate(
      `/teacher/marks?mid=${mod.moid}&cid=${cid}&name=${encodeURIComponent(mod.mname)}`
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <Link
            to="/teacher/classes"
            className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Classes
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Choose Module</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {level && `${level} · `}
            Select a module to enter marks
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-5">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Empty */}
        {!error && modules.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-book text-5xl text-gray-300 mb-4 block"></i>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No modules available</h2>
            <p className="text-gray-500 text-sm">
              You have no permitted modules for this class.
            </p>
          </div>
        )}

        {/* Module grid */}
        {modules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <button
                key={mod.moid}
                onClick={() => handlePickModule(mod)}
                className="bg-white text-gray-800 text-lg font-semibold py-5 px-4 rounded-lg shadow-md hover:bg-green-50 hover:shadow-lg transition-all border border-green-100 flex flex-col items-center gap-2"
              >
                <i className="fas fa-book-open text-2xl text-green-800"></i>
                <span className="text-center">{mod.mname}</span>
                <div className="flex gap-2 text-xs text-gray-500 font-normal">
                  {mod.mcode && <span>{mod.mcode}</span>}
                  {mod.credit ? <span>· {mod.credit} cr</span> : null}
                  {mod.module_type && <span>· {mod.module_type}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <i className="fas fa-info-circle mr-1"></i>
          You will be redirected to the marks entry page.
        </div>
      </div>
    </div>
  );
}