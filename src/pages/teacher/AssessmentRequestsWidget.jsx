// src/pages/teacher/AssessmentRequestsWidget.jsx
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiFetch, getStoredAuth } from '../../api/client';

export default function AssessmentRequestsWidget() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/api/teacher/assessment-requests');
      setRequests(data.requests || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    const auth = getStoredAuth();
    socketRef.current = io('/', {
      withCredentials: true,
      auth: { token: auth?.token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('assessment-request', () => load(true));
    socketRef.current.on('assessment-approved-ack', () => load(true));
    socketRef.current.on('assessment-rejected-ack', () => load(true));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      socketRef.current = null;
    };
  }, []);

  const approve = async (req) => {
    const key = `${req.assessment_id}:${req.sid}`;
    setBusyKey(key);
    setError('');
    try {
      await apiFetch(
        `/api/teacher/assessments/${req.assessment_id}/approve/${req.sid}`,
        { method: 'POST' }
      );
      setRequests((prev) => prev.filter((r) => !(r.assessment_id === req.assessment_id && r.sid === req.sid)));
      await load(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const reject = async (req) => {
    const key = `${req.assessment_id}:${req.sid}`;
    setBusyKey(key);
    setError('');
    try {
      await apiFetch(
        `/api/teacher/assessments/${req.assessment_id}/reject/${req.sid}`,
        { method: 'POST' }
      );
      setRequests((prev) => prev.filter((r) => !(r.assessment_id === req.assessment_id && r.sid === req.sid)));
      await load(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-bell text-yellow-600"></i>
          Pending Start Requests
          {requests.length > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => load()}
          className="text-sm text-gray-600 hover:text-gray-900 font-semibold"
          disabled={loading}
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} mr-1`}></i>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-6">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading…
        </p>
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">
          <i className="fas fa-check-circle text-green-500 mr-2"></i>
          No pending requests.
        </p>
      ) : (
        <ul className="divide-y">
          {requests.map((r) => {
            const key = `${r.assessment_id}:${r.sid}`;
            const isBusy = busyKey === key;
            const studentName =
              `${r.firstname || ''} ${r.lastname || ''}`.trim() || `SID ${r.sid}`;
            return (
              <li key={key} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-gray-800">
                    {studentName}
                    {r.reg && <span className="text-xs text-gray-500 ml-2">({r.reg})</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    <i className="fas fa-file-alt mr-1 text-gray-400"></i>
                    {r.title}
                    <span className="text-gray-400 ml-2">·</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString() : ''}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(r)}
                    disabled={isBusy}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isBusy ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                    Approve
                  </button>
                  <button
                    onClick={() => reject(r)}
                    disabled={isBusy}
                    className="border border-red-500 text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isBusy ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>}
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}