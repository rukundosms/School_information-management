import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherClassReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [report, setReport] = useState(null);
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
    if (!selectedClass) { setReport(null); return; }
    (async () => {
      setLoadingReport(true);
      try {
        const data = await apiFetch(`/api/teacher/class-reports?cid=${selectedClass}`);
        setReport(data);
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
            <i className="fas fa-chart-pie"></i> Class Reports
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
                <i className="fas fa-chart-line mr-1"></i> Generate
              </button>
            </div>
          </form>
        </div>

        {loadingReport && (
          <div className="text-center py-8 text-gray-500">Generating report…</div>
        )}

        {!loadingReport && report && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <StatCard icon="fa-users" value={report.studentCount} label="Total Students" />
              <StatCard icon="fa-tasks" value={report.assessmentCount} label="Assessments" />
              <StatCard icon="fa-calendar-check" value={`${report.attendanceRate}%`} label="Attendance Rate" />
            </div>

            {/* Assessment performance */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b">
                <h2 className="font-bold text-gray-800">Assessment Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-900 text-white">
                      <th className="text-left px-3 py-2">Assessment</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-center px-3 py-2">Total Marks</th>
                      <th className="text-center px-3 py-2">Average Score</th>
                      <th className="text-center px-3 py-2">Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.assessments.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-500 italic">No assessments found.</td></tr>
                    ) : (
                      report.assessments.map(a => (
                        <tr key={a.assessment_id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{a.title}</td>
                          <td className="px-3 py-2 capitalize">{a.assessment_type}</td>
                          <td className="text-center px-3 py-2">{a.total_marks}</td>
                          <td className="text-center px-3 py-2">
                            {a.submissions > 0
                              ? `${Number(a.avg_marks).toFixed(2)} / ${a.total_marks}`
                              : 'No submissions'}
                          </td>
                          <td className="text-center px-3 py-2">{a.submissions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 text-center">
      <i className={`fas ${icon} text-3xl text-gray-400 mb-2`}></i>
      <div className="text-3xl font-bold text-green-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}