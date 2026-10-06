// src/pages/teacher/TeacherMarkAttendance.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherMarkAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedClass = searchParams.get('class') || '';
  const selectedDate = searchParams.get('date') || new Date().toISOString().slice(0, 10);

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
    if (!selectedClass) { setStudents([]); return; }
    (async () => {
      setLoadingStudents(true);
      try {
        const data = await apiFetch(
          `/api/teacher/attendance-students?cid=${selectedClass}&date=${selectedDate}`
        );
        setStudents(data.students || []);
        const map = {};
        (data.students || []).forEach(s => {
          map[s.sid] = s.attendance_status || 'present';
        });
        setStatusMap(map);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleLoad = (e) => {
    e.preventDefault();
    const form = e.target;
    const params = new URLSearchParams();
    if (form.class.value) params.set('class', form.class.value);
    if (form.date.value) params.set('date', form.date.value);
    setSearchParams(params);
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    try {
      await apiFetch('/api/teacher/attendance', {
        method: 'POST',
        body: JSON.stringify({
          cid: selectedClass,
          date: selectedDate,
          attendance: statusMap,
        }),
      });
      setSuccess('Attendance saved successfully!');
    } catch (err) {
      setError(err.message);
    }
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
            <i className="fas fa-user-check"></i> Mark Attendance
          </h1>
        </div>

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-lg mb-4">
            <i className="fas fa-check-circle mr-2"></i>{success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-5">
          <form onSubmit={handleLoad} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                required
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-green-800 hover:bg-green-900 text-white py-2.5 rounded-lg font-semibold"
              >
                <i className="fas fa-search mr-1"></i> Load Students
              </button>
            </div>
          </form>
        </div>

        {/* Students table */}
        {selectedClass && loadingStudents && (
          <div className="text-center py-8 text-gray-500">Loading students…</div>
        )}

        {selectedClass && !loadingStudents && students.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-green-800 text-white px-5 py-3">
              <h2 className="font-bold">
                Attendance for {new Date(selectedDate).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-900 text-white">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Student Name</th>
                    <th className="text-left px-3 py-2">Reg Number</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.sid} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{s.firstname} {s.lastname}</td>
                      <td className="px-3 py-2">{s.reg || '-'}</td>
                      <td className="px-3 py-2">
                        <select
                          value={statusMap[s.sid] || 'present'}
                          onChange={(e) => setStatusMap({ ...statusMap, [s.sid]: e.target.value })}
                          className="border-2 border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-green-700"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t bg-gray-50">
              <button
                onClick={handleSave}
                className="bg-green-800 hover:bg-green-900 text-white px-6 py-2.5 rounded-lg font-semibold"
              >
                <i className="fas fa-save mr-1"></i> Save Attendance
              </button>
            </div>
          </div>
        )}

        {selectedClass && !loadingStudents && students.length === 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg">
            No students found in this class.
          </div>
        )}
      </div>
    </div>
  );
}