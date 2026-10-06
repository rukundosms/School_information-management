import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherStudentPerformance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  const selectedClass = searchParams.get('cid') || '';

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

  useEffect(() => {
    if (!selectedClass) { setRows([]); return; }
    (async () => {
      setLoadingReport(true);
      try {
        const data = await apiFetch(`/api/teacher/student-performance?cid=${selectedClass}`);
        setRows(data.students || []);
        setClassName(data.className || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedClass]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (e.target.class.value) params.set('cid', e.target.class.value);
    setSearchParams(params);
  };

  const gradeColor = (g) =>
    g === 'A' ? 'text-green-700' :
    g === 'B' ? 'text-orange-600' :
    'text-red-700';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin"></div>
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
            <i className="fas fa-chart-line"></i> Student Performance
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-5 mb-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Class</label>
              <select
                name="class"
                defaultValue={selectedClass}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.cid} value={c.cid}>{c.class_name}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-green-800 hover:bg-green-900 text-white py-2.5 rounded-lg font-semibold"
              >
                <i className="fas fa-search mr-1"></i> View
              </button>
            </div>
          </form>
        </div>

        {loadingReport && (
          <div className="text-center py-8 text-gray-500">Loading…</div>
        )}

        {!loadingReport && selectedClass && rows.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b">
              <h2 className="font-bold text-gray-800">Performance – {className}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-900 text-white">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Student Name</th>
                    <th className="text-left px-3 py-2">Reg</th>
                    <th className="text-center px-3 py-2">Avg Score</th>
                    <th className="text-center px-3 py-2">Grade</th>
                    <th className="text-center px-3 py-2">Assessments</th>
                    <th className="text-center px-3 py-2">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, idx) => (
                    <tr key={s.sid} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{s.firstname} {s.lastname}</td>
                      <td className="px-3 py-2">{s.reg || '-'}</td>
                      <td className="text-center px-3 py-2">{s.avg}%</td>
                      <td className={`text-center px-3 py-2 font-bold ${gradeColor(s.grade)}`}>{s.grade}</td>
                      <td className="text-center px-3 py-2">{s.total_assessments}</td>
                      <td className="text-center px-3 py-2">{s.attendance_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loadingReport && selectedClass && rows.length === 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg">
            No students found for this class.
          </div>
        )}
      </div>
    </div>
  );
}