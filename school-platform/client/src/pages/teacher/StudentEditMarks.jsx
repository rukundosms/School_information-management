// src/pages/teacher/TeacherEditMarks.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherEditMarks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cid = searchParams.get('cid');
  const mid = searchParams.get('mid');
  const term = searchParams.get('term') || '';
  const year = searchParams.get('year') || '';
  const yearLabel = searchParams.get('yearLabel') || '';
  const name = searchParams.get('name') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState({});
  const [defaultTotal, setDefaultTotal] = useState(0);
  const [rows, setRows] = useState([]);         // { sid, firstname, lastname, mark_id, test, ttotal, exam, etotal }
  const [original, setOriginal] = useState({}); // sid -> { test, ttotal, exam, etotal }
  const [notification, setNotification] = useState(null);
  const [saving, setSaving] = useState(false);

  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  const showNotif = (msg, color = '#28a745') => setNotification({ msg, color });

  useEffect(() => {
    if (!cid || !mid || !year || !term) {
      setLoading(false);
      setError('Missing context. Please start over.');
      return;
    }
    (async () => {
      try {
        const q = `?cid=${cid}&mid=${mid}&year=${year}&term=${term}`;
        const data = await apiFetch(`/api/teacher/edit-marks${q}`);
        setInfo(data.info || {});
        setDefaultTotal(data.defaultTotal || 0);

        const list = (data.students || []).map(s => ({
          sid: s.sid,
          firstname: s.firstname,
          lastname: s.lastname,
          mark_id: s.mark_id || '',
          test: s.test ?? '',
          ttotal: s.ttotal ?? data.defaultTotal ?? '',
          exam: s.exam ?? '',
          etotal: s.etotal ?? data.defaultTotal ?? '',
        }));
        setRows(list);

        const orig = {};
        list.forEach(r => {
          orig[r.sid] = { test: r.test, ttotal: r.ttotal, exam: r.exam, etotal: r.etotal };
        });
        setOriginal(orig);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cid, mid, year, term]);

  // Derived: modified sids
  const modifiedSids = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      const o = original[r.sid];
      if (!o) return;
      if (String(r.test) !== String(o.test) ||
          String(r.ttotal) !== String(o.ttotal) ||
          String(r.exam) !== String(o.exam) ||
          String(r.etotal) !== String(o.etotal)) {
        set.add(r.sid);
      }
    });
    return set;
  }, [rows, original]);

  const updateField = (sid, field, value) => {
    setRows(prev =>
      prev.map(r => (r.sid === sid ? { ...r, [field]: value } : r))
    );
  };

  const validateRow = (row) => {
    const test = row.test === '' ? null : parseFloat(row.test);
    const ttotal = row.ttotal === '' ? defaultTotal : parseFloat(row.ttotal);
    const exam = row.exam === '' ? null : parseFloat(row.exam);
    const etotal = row.etotal === '' ? defaultTotal : parseFloat(row.etotal);

    if (test !== null && !isNaN(test) && !isNaN(ttotal) && test > ttotal) {
      return `Test (${test}) cannot exceed test total (${ttotal})`;
    }
    if (exam !== null && !isNaN(exam) && !isNaN(etotal) && exam > etotal) {
      return `Exam (${exam}) cannot exceed exam total (${etotal})`;
    }
    return null;
  };

  const saveRow = async (row) => {
    const err = validateRow(row);
    if (err) {
      showNotif(err, '#dc3545');
      return false;
    }

    const test = row.test === '' ? '' : Number(row.test);
    const ttotal = row.ttotal === '' ? defaultTotal : Number(row.ttotal);
    const exam = row.exam === '' ? '' : Number(row.exam);
    const etotal = row.etotal === '' ? defaultTotal : Number(row.etotal);
    const ototal = (test !== '' && exam !== '') ? test + exam : '';
    const mtotal = (ttotal !== '' && etotal !== '') ? ttotal + etotal : '';

    try {
      const data = await apiFetch('/api/teacher/save-markedit', {
        method: 'POST',
        body: JSON.stringify({
          sid: row.sid,
          mark_id: row.mark_id,
          test, ttotal, exam, etotal,
          ototal, mtotal,
          class: cid,
          module: mid,
          term, year,
        }),
      });

      if (!data.success) throw new Error(data.error || 'Save failed');

      // Update mark_id in state if new
      if (data.mark_id) {
        setRows(prev =>
          prev.map(r => (r.sid === row.sid ? { ...r, mark_id: data.mark_id } : r))
        );
      }

      // Update original snapshot
      setOriginal(prev => ({
        ...prev,
        [row.sid]: { test, ttotal, exam, etotal },
      }));

      showNotif(data.message || 'Saved', '#28a745');
      return true;
    } catch (err) {
      showNotif('Save failed: ' + err.message, '#dc3545');
      return false;
    }
  };

  const saveAll = async () => {
    if (modifiedSids.size === 0) {
      showNotif('No changes to save', '#ffc107');
      return;
    }
    setSaving(true);
    let ok = 0, fail = 0;
    for (const r of rows) {
      if (!modifiedSids.has(r.sid)) continue;
      const success = await saveRow(r);
      if (success) ok++; else fail++;
    }
    setSaving(false);
    if (fail === 0) showNotif(`Successfully saved ${ok} students' marks`, '#28a745');
    else showNotif(`Saved ${ok}, failed ${fail}`, '#dc3545');
  };

  const resetTotals = () => {
    if (!confirm(`Reset all total fields to default (${defaultTotal})?`)) return;
    setRows(prev =>
      prev.map(r => ({
        ...r,
        ttotal: defaultTotal,
        etotal: defaultTotal,
      }))
    );
    showNotif('Totals reset. Click Save All to apply.', '#ffc107');
  };

  // Warn on unload if unsaved
  useEffect(() => {
    const handler = (e) => {
      if (modifiedSids.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifiedSids]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Notification */}
      {notification && (
        <div
          className="fixed top-4 right-4 px-5 py-3 rounded-lg text-white font-semibold shadow-lg z-50"
          style={{ backgroundColor: notification.color }}
        >
          {notification.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4 mb-5 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {info.level} – {info.class_name}
            </h2>
            <h2 className="text-base">
              <i className="fas fa-book mr-1"></i>{info.mname || name}
            </h2>
          </div>
          <div className="text-right text-sm">
            <span className="inline-block bg-white/20 rounded-full px-3 py-1 mr-2">Term {term}</span>
            <span className="inline-block bg-white/20 rounded-full px-3 py-1">
              Default Total: {defaultTotal}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex gap-2">
            <Link
              to={`/teacher/list?cid=${cid}&mid=${mid}&term=${term}&year=${year}&yearLabel=${encodeURIComponent(yearLabel)}&name=${encodeURIComponent(name)}`}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <i className="fas fa-arrow-left mr-1"></i> Back to List
            </Link>
            <button
              onClick={resetTotals}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <i className="fas fa-undo mr-1"></i> Reset Totals
            </button>
          </div>

          <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="font-bold text-indigo-600">{rows.length}</span> Students |{' '}
            <span className="font-bold text-green-600">{rows.length - modifiedSids.size}</span> Saved |{' '}
            <span className="font-bold text-yellow-600">{modifiedSids.size}</span> Modified
          </div>

          <button
            onClick={saveAll}
            disabled={saving || modifiedSids.size === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <i className="fas fa-save mr-1"></i> {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <tr>
                <th colSpan={6} className="border px-3 py-2">
                  Term {term} – {info.mname || name}
                </th>
              </tr>
              <tr>
                <th className="border px-3 py-2">No</th>
                <th className="border px-3 py-2 text-left">Student Name</th>
                <th className="border px-3 py-2">Test</th>
                <th className="border px-3 py-2">Test Total</th>
                <th className="border px-3 py-2">Exam</th>
                <th className="border px-3 py-2">Exam Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isModified = modifiedSids.has(r.sid);
                return (
                  <tr key={r.sid} className={idx % 2 ? 'bg-gray-50' : ''}>
                    <td className="border px-3 py-2 text-center">{idx + 1}</td>
                    <td className="border px-3 py-2">
                      {r.firstname} {r.lastname}
                    </td>
                    <td className={`border px-3 py-2 text-center ${isModified ? 'bg-yellow-50' : ''}`}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={r.test}
                        onChange={(e) => updateField(r.sid, 'test', e.target.value)}
                        onBlur={() => {
                          const err = validateRow(r);
                          if (err) showNotif(err, '#dc3545');
                          else if (modifiedSids.has(r.sid)) saveRow(r);
                        }}
                        className="w-20 border-2 rounded px-2 py-1 text-center focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className={`border px-3 py-2 text-center ${isModified ? 'bg-yellow-50' : ''}`}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={r.ttotal}
                        onChange={(e) => updateField(r.sid, 'ttotal', e.target.value)}
                        onBlur={() => {
                          const err = validateRow(r);
                          if (err) showNotif(err, '#dc3545');
                          else if (modifiedSids.has(r.sid)) saveRow(r);
                        }}
                        className="w-20 border-2 rounded px-2 py-1 text-center bg-gray-100 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className={`border px-3 py-2 text-center ${isModified ? 'bg-yellow-50' : ''}`}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={r.exam}
                        onChange={(e) => updateField(r.sid, 'exam', e.target.value)}
                        onBlur={() => {
                          const err = validateRow(r);
                          if (err) showNotif(err, '#dc3545');
                          else if (modifiedSids.has(r.sid)) saveRow(r);
                        }}
                        className="w-20 border-2 rounded px-2 py-1 text-center focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className={`border px-3 py-2 text-center ${isModified ? 'bg-yellow-50' : ''}`}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={r.etotal}
                        onChange={(e) => updateField(r.sid, 'etotal', e.target.value)}
                        onBlur={() => {
                          const err = validateRow(r);
                          if (err) showNotif(err, '#dc3545');
                          else if (modifiedSids.has(r.sid)) saveRow(r);
                        }}
                        className="w-20 border-2 rounded px-2 py-1 text-center bg-gray-100 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 italic py-6">
                    No active students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}