// src/pages/teacher/TeacherList.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cid = searchParams.get('cid');
  const mid = searchParams.get('mid');
  const term = searchParams.get('term') || '';
  const year = searchParams.get('year') || '';
  const yearLabel = searchParams.get('yearLabel') || '';
  const name = searchParams.get('name') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cid || !mid || !year || !term) {
      setLoading(false);
      setError('Missing context. Please start over.');
      return;
    }
    (async () => {
      try {
        const q = `?cid=${cid}&mid=${mid}&year=${year}&term=${term}`;
        const res = await apiFetch(`/api/teacher/list-marks${q}`);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, mid, year, term]);

  const handleEdit = () => {
    const params = new URLSearchParams({ cid, mid, year, term, yearLabel, name });
    navigate(`/teacher/edit-marks?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marks…</p>
        </div>
      </div>
    );
  }

  const info = data?.info || {};
  const students = data?.students || [];
  const markedCount = data?.markedCount || 0;
  const academicYearName = data?.academicYearName || yearLabel || year;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
        {/* Back */}
        <Link
          to={`/teacher/mymodules?cid=${cid}&year=${year}&term=${term}&yearLabel=${encodeURIComponent(yearLabel)}`}
          className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-4"
        >
          <i className="fas fa-arrow-left"></i> Back to Modules
        </Link>

        {/* Year info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-3 rounded mb-4 text-center">
          📅 Academic Year: <strong>{academicYearName}</strong>
        </div>

        {/* Term header */}
        <div className="bg-blue-100 text-blue-900 p-3 rounded mb-4 text-center font-semibold">
          Term {term}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {markedCount === 0 && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-sm">
            No marks have been entered for this term yet. Showing all students with empty marks.
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <caption className="py-2 text-lg font-bold text-gray-800">
              {info.level} – {info.mname || name}
            </caption>
            <thead>
              <tr className="bg-green-700 text-white">
                <th className="border px-3 py-2">No</th>
                <th className="border px-3 py-2 text-left">Student Name</th>
                <th className="border px-3 py-2">Test</th>
                <th className="border px-3 py-2">Test Total</th>
                <th className="border px-3 py-2">Exam</th>
                <th className="border px-3 py-2">Exam Total</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 italic py-6">
                    No active students found in this class for the selected academic year
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const hasTest = s.test !== null && s.test !== undefined && s.test !== '';
                  const hasExam = s.exam !== null && s.exam !== undefined && s.exam !== '';
                  return (
                    <tr key={s.sid} className={idx % 2 ? 'bg-gray-50' : ''}>
                      <td className="border px-3 py-2 text-center">{idx + 1}</td>
                      <td className="border px-3 py-2">
                        {s.firstname} {s.lastname}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {hasTest ? s.test : <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {hasTest && s.ttotal !== null ? s.ttotal : <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {hasExam ? s.exam : <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        {hasExam && s.etotal !== null ? s.etotal : <span className="text-gray-400 italic">-</span>}
                      </td>
                    </tr>
                  );
                })
              )}
              {students.length > 0 && (
                <tr className="bg-green-50 font-bold">
                  <td colSpan={2} className="border px-3 py-2">Summary</td>
                  <td colSpan={4} className="border px-3 py-2 text-left">
                    Total Students: {students.length} | Students with marks: {markedCount}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mt-6 print:hidden">
          <button
            onClick={handleEdit}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg font-semibold"
          >
            Edit Marks
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg font-semibold"
          >
            Print
          </button>
          <Link
            to={`/teacher/mymodules?cid=${cid}&year=${year}&term=${term}&yearLabel=${encodeURIComponent(yearLabel)}`}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg font-semibold"
          >
            Back to Modules
          </Link>
        </div>
      </div>
    </div>
  );
}