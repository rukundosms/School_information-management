// src/pages/teacher/TeacherUploadMarks.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherUploadMarks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cid = searchParams.get('cid');
  const mid = searchParams.get('mid');
  const year = searchParams.get('year');
  const term = searchParams.get('term');
  const type = searchParams.get('type'); // '1' = Test, '2' = Exam
  const name = searchParams.get('name') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('normal'); // 'normal' | 'already_exists' | 'need_test_first'
  const [message, setMessage] = useState('');
  const [module, setModule] = useState({});
  const [total, setTotal] = useState(0);
  const [students, setStudents] = useState([]);

  // Track per-student status
  // { [sid]: { status: 'pending'|'saving'|'saved'|'error', value, message } }
  const [status, setStatus] = useState({});
  const [notification, setNotification] = useState(null);

  // Save timers
  const timersRef = useRef({});

  const typeName = type === '1' ? 'Test' : 'Exam';

  // Load context
  useEffect(() => {
    if (!cid || !mid || !year || !term || !type) {
      setLoading(false);
      setError('Missing parameters. Please start over.');
      return;
    }
    (async () => {
      try {
        const q = `?cid=${cid}&mid=${mid}&year=${year}&term=${term}&type=${type}`;
        const data = await apiFetch(`/api/teacher/teacher-upload-marks/context${q}`);
        if (data.mode && data.mode !== 'normal') {
          setMode(data.mode);
          setMessage(data.message);
        } else {
          setMode('normal');
          setModule(data.module || {});
          setTotal(data.total || 0);
          const initialStatus = {};
          (data.students || []).forEach(s => {
            initialStatus[s.sid] = {
              status: s.existingMark !== '' && s.existingMark !== null ? 'saved' : 'pending',
              value: s.existingMark ?? '',
              message: s.existingMark !== '' ? `Saved (${s.existingMark})` : 'Not saved',
            };
          });
          setStatus(initialStatus);
          setStudents(data.students || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, mid, year, term, type]);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const showNotification = (msg, kind = 'success') => setNotification({ msg, kind });

  const setStudentStatus = (sid, patch) => {
    setStatus(prev => ({ ...prev, [sid]: { ...prev[sid], ...patch } }));
  };

  const saveMark = useCallback(async (sid, rawValue) => {
    const trimmed = String(rawValue ?? '').trim();

    if (trimmed === '') {
      setStudentStatus(sid, { status: 'error', message: 'Empty' });
      return;
    }

    const value = parseFloat(trimmed);
    if (isNaN(value)) {
      setStudentStatus(sid, { status: 'error', message: 'Invalid number' });
      return;
    }
    if (value < 0) {
      setStudentStatus(sid, { status: 'error', message: 'Cannot be negative' });
      return;
    }
    if (value > total) {
      setStudentStatus(sid, { status: 'error', message: `Exceeds max (${total})` });
      showNotification(`Mark ${value} exceeds maximum ${total}!`, 'error');
      return;
    }

    setStudentStatus(sid, { status: 'saving', value: trimmed, message: 'Saving…' });

    try {
      const data = await apiFetch('/api/teacher/teacher-upload-marks/save', {
        method: 'POST',
        body: JSON.stringify({
          cid, mid, year, term, type,
          student_id: sid,
          mark_data: trimmed,
        }),
      });

      if (data.success) {
        setStudentStatus(sid, {
          status: 'saved',
          value: trimmed,
          message: `Saved (${trimmed})`,
        });
        showNotification(data.message || 'Saved!', 'success');
      } else {
        setStudentStatus(sid, { status: 'error', message: data.message || 'Error' });
        showNotification('Save error: ' + (data.message || 'unknown'), 'error');
      }
    } catch (err) {
      setStudentStatus(sid, { status: 'error', message: 'Failed' });
      showNotification('Save failed: ' + err.message, 'error');
    }
  }, [cid, mid, year, term, type, total]);

  const handleInputChange = (sid, value) => {
    setStudentStatus(sid, { status: 'pending', value, message: 'Pending…' });
    if (timersRef.current[sid]) clearTimeout(timersRef.current[sid]);
    timersRef.current[sid] = setTimeout(() => saveMark(sid, value), 1000);
  };

  const handleInputBlur = (sid) => {
    const val = status[sid]?.value ?? '';
    if (String(val).trim() !== '') saveMark(sid, val);
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

  // Gating screens (already_exists / need_test_first)
  if (mode === 'already_exists') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
          <i className="fas fa-info-circle text-4xl text-yellow-500 mb-3"></i>
          <h2 className="text-xl font-bold mb-3">{message}</h2>
          <div className="flex flex-col gap-3 mt-4">
            <Link to={`/teacher/marks?cid=${cid}&mid=${mid}&name=${encodeURIComponent(name)}`}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold">
              View Assessment
            </Link>
            <button onClick={() => navigate(-1)} className="border border-gray-300 px-4 py-2 rounded-lg">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'need_test_first') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <h2 className="text-xl font-bold mb-3">{message}</h2>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => navigate(`/teacher/upload-marks?cid=${cid}&mid=${mid}&year=${year}&term=${term}&type=1&name=${encodeURIComponent(name)}`)}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Enter Test Marks
            </button>
            <button onClick={() => navigate(-1)} className="border border-gray-300 px-4 py-2 rounded-lg">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-b-lg font-semibold text-white shadow-lg ${
            notification.kind === 'success'
              ? 'bg-green-600'
              : notification.kind === 'error'
              ? 'bg-red-600'
              : 'bg-yellow-500 text-black'
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <Link
          to={`/teacher/marks?cid=${cid}&mid=${mid}&name=${encodeURIComponent(name)}`}
          className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-4"
        >
          <i className="fas fa-arrow-left"></i> Back to Marks
        </Link>

        {/* Info bar */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-center text-sm mb-4">
          <strong>{typeName}</strong> | Term: {term} | Total Marks: <strong>{total}</strong> |{' '}
          <span className="text-yellow-700">* Marks cannot exceed {total}</span>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl shadow-md">
          <table className="min-w-full text-sm">
            <caption className="bg-green-700 text-white font-bold py-3 text-base">
              Enter {typeName} Marks (0 – {total})
            </caption>
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 w-12">#</th>
                <th className="border px-3 py-2 text-left">Student Name</th>
                <th className="border px-3 py-2">Marks (0 – {total})</th>
                <th className="border px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-red-600 bg-red-50">
                    <strong>No students found for this class in the selected year.</strong>
                    <br />
                    Please check if students are properly assigned to this class.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const st = status[s.sid] || { status: 'pending', value: '', message: 'Not saved' };
                  const inputValue = st.value ?? '';
                  const inputCls =
                    st.status === 'saved'
                      ? 'border-green-500 bg-green-50'
                      : st.status === 'error'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300';

                  return (
                    <tr key={s.sid} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center">{idx + 1}</td>
                      <td className="border px-3 py-2">
                        {s.firstname} {s.lastname}
                      </td>
                      <td className="border px-3 py-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={total}
                          placeholder={`0-${total}`}
                          value={inputValue}
                          onChange={(e) => handleInputChange(s.sid, e.target.value)}
                          onBlur={() => handleInputBlur(s.sid)}
                          className={`w-28 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 ${inputCls}`}
                        />
                      </td>
                      <td className="border px-3 py-2 text-center">
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded ${
                            st.status === 'saved'
                              ? 'bg-green-100 text-green-800'
                              : st.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : st.status === 'saving'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {st.status === 'saving' ? 'Saving…' : st.message}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-center text-xs text-gray-500 py-3">
                  Marks are automatically saved when valid. Maximum allowed: {total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}