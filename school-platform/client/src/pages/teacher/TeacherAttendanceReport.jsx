// src/pages/teacher/TeacherAttendanceReport.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherAttendanceReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  const selectedClass = searchParams.get('class') || '';
  const selectedMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

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
        const data = await apiFetch(
          `/api/teacher/attendance-report?cid=${selectedClass}&month=${selectedMonth}`
        );
        setRows(data.rows || []);
        setClassName(data.className || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedClass, selectedMonth]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const params = new URLSearchParams();
    if (form.class.value) params.set('class', form.class.value);
    if (form.month.value) params.set('month', form.month.value);
    setSearchParams(params);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
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
            <i className="fas fa-file-alt"></i> Attendance Report
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-5 mb-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Month</label>
              <input
                type="month"
                name="month"
                defaultValue={selectedMonth}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-green-800 hover:bg-green-900 text-white py-2.5 rounded-lg font-semibold"
              >
                <i className="fas fa-chart-line mr-1"></i> Generate Report
              </button>
            </div>
          </form>
        </div>

        {selectedClass && loadingReport && (
          <div className="text-center py-8 text-gray-500">Generating report…</div>
        )}

        {selectedClass && !loadingReport && rows.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-green-800 text-white px-5 py-3">
              <h2 className="font-bold">
                Attendance Report – {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long',
                })} – {className}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-900 text-white">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Student Name</th>
                    <th className="text-left px-3 py-2">Reg</th>
                    <th className="text-center px-3 py-2">Present</th>
                    <th className="text-center px-3 py-2">Absent</th>
                    <th className="text-center px-3 py-2">Late</th>
                    <th className="text-center px-3 py-2">Excused</th>
                    <th className="text-center px-3 py-2">Total</th>
                    <th className="text-center px-3 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.sid} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{r.firstname} {r.lastname}</td>
                      <td className="px-3 py-2">{r.reg || '-'}</td>
                      <td className="text-center px-3 py-2">{r.present_days}</td>
                      <td className="text-center px-3 py-2">{r.absent_days}</td>
                      <td className="text-center px-3 py-2">{r.late_days}</td>
                      <td className="text-center px-3 py-2">{r.excused_days}</td>
                      <td className="text-center px-3 py-2">{r.total_days}</td>
                      <td className={`text-center px-3 py-2 font-bold ${
                        r.percentage >= 75 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {r.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}