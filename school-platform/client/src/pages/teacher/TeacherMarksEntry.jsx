// src/pages/teacher/TeacherMarksEntry.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherMarksEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cid = searchParams.get('cid');
  const mid = searchParams.get('mid');
  const name = searchParams.get('name') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Right-panel form
  const [form, setForm] = useState({
    year: '',
    tearm: '1',
    type: '',
    total: '',
  });

  useEffect(() => {
    if (!cid || !mid) {
      setLoading(false);
      setError('Missing class or module. Please start over.');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch(`/api/teacher/teacher-marks/${cid}/${mid}`);
        setData(res);
        setForm(f => ({
          ...f,
          year: res.activeYear ? String(res.activeYear.year_id) : '',
          total: String(res.autoTotal ?? ''),
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, mid]);

  const handleContinue = (e) => {
    e.preventDefault();
    if (!form.year || !form.type || form.total === '') {
      setError('Please select Year and Assessment Type, and ensure Total marks is filled.');
      return;
    }
    const params = new URLSearchParams({
      cid,
      mid,
      name,
      year: form.year,
      term: form.tearm,
      type: form.type,
      total: form.total,
    });
    navigate(`/teacher/upload-marks?${params.toString()}`);
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
  const activeYear = data?.activeYear;
  const students = data?.students || [];
  const years = data?.years || [];
  const assessments = data?.assessments || [];

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          to={`/teacher/modules?cid=${cid}`}
          className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-4"
        >
          <i className="fas fa-arrow-left"></i> Back to Modules
        </Link>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-5">
          {/* LEFT — Marks table */}
          <div className="md:w-3/4 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <caption className="text-center font-bold text-lg text-green-900 py-3 bg-green-50">
                  {info.level} {info.mname}
                  {activeYear && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      — Active Year: {activeYear.year}
                    </span>
                  )}
                </caption>
                <thead>
                  <tr className="bg-gray-100">
                    <th rowSpan="2" className="border px-2 py-2">No</th>
                    <th rowSpan="2" className="border px-2 py-2 text-left">Names</th>
                    <th colSpan="4" className="border px-2 py-2">Term 1</th>
                    <th colSpan="4" className="border px-2 py-2">Term 2</th>
                    <th colSpan="4" className="border px-2 py-2">Term 3</th>
                  </tr>
                  <tr className="bg-gray-50">
                    {[1, 2, 3].map(t => (
                      <>
                        <th key={`t${t}-test`} className="border px-2 py-1">Test</th>
                        <th key={`t${t}-ttotal`} className="border px-2 py-1">Total</th>
                        <th key={`t${t}-exam`} className="border px-2 py-1">Exam</th>
                        <th key={`t${t}-etotal`} className="border px-2 py-1">Total</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-6 text-gray-500 italic">
                        No active students found for the active year.
                      </td>
                    </tr>
                  ) : (
                    students.map((s, idx) => (
                      <tr key={s.sid} className="hover:bg-gray-50">
                        <td className="border px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border px-2 py-1 whitespace-nowrap">
                          {s.firstname} {s.lastname}
                        </td>
                        {[1, 2, 3].map(term => {
                          const m = s.marks?.[term] || {};
                          return (
                            <>
                              <td key={`${s.sid}-t${term}-test`} className="border px-2 py-1 text-center">
                                {m.test !== undefined && m.test !== null && m.test !== ''
                                  ? m.test
                                  : <span className="text-gray-400 italic">-</span>}
                              </td>
                              <td key={`${s.sid}-t${term}-ttotal`} className="border px-2 py-1 text-center">
                                {m.ttotal !== undefined && m.ttotal !== null && m.ttotal !== ''
                                  ? m.ttotal
                                  : <span className="text-gray-400 italic">-</span>}
                              </td>
                              <td key={`${s.sid}-t${term}-exam`} className="border px-2 py-1 text-center">
                                {m.exam !== undefined && m.exam !== null && m.exam !== ''
                                  ? m.exam
                                  : <span className="text-gray-400 italic">-</span>}
                              </td>
                              <td key={`${s.sid}-t${term}-etotal`} className="border px-2 py-1 text-center">
                                {m.etotal !== undefined && m.etotal !== null && m.etotal !== ''
                                  ? m.etotal
                                  : <span className="text-gray-400 italic">-</span>}
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT — Upload panel */}
          <div className="md:w-1/4 bg-white rounded-xl shadow-md p-5 h-fit">
            <p className="text-sm text-gray-600">Class: <strong>{info.level}</strong></p>
            <p className="text-sm text-gray-600 mb-3">Subject: <strong>{info.mname || name}</strong></p>

            <h2 className="text-xl font-bold text-green-900 mb-3 text-center">Upload Marks</h2>

            <form onSubmit={handleContinue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full border border-green-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Year</option>
                  {years.map(y => (
                    <option key={y.year_id} value={y.year_id}>
                      {y.year} {y.status === 'active' ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Term <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tearm}
                  onChange={(e) => setForm({ ...form, tearm: e.target.value })}
                  className="w-full border border-green-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assessment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-green-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Assessment</option>
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Total marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.total}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Calculated automatically (Credit × 10)
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg"
              >
                Next
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}