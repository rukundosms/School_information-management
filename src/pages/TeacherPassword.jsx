// src/pages/TeacherPassword.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch, setStoredAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TeacherPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  // The code was passed from TeacherCode.jsx via navigate(..., { state: { tcode } })
  const tcode = location.state?.tcode || '';

  // ─── Guard: no code means user landed here directly ───
  if (!tcode) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
          <h2 style={{ marginTop: 0 }}>Teacher password</h2>
          <div className="alert-error">
            No teacher code provided. Please start from the teacher code step.
          </div>
          <p style={{ marginTop: '1rem' }}>
            <Link to="/login/teacher">← Enter teacher code</Link>
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Basic client-side validation
      if (!password || password.length < 1) {
        throw new Error('Please enter your password');
      }

      // 2. Call backend
      console.log('[TeacherPassword] POST /api/auth/teacher/login', { tcode, passwordLength: password.length });

      let data;
      try {
        data = await apiFetch('/api/auth/teacher/login', {
          method: 'POST',
          body: JSON.stringify({ tcode, password }),
        });
      } catch (fetchErr) {
        // Backend returned non-2xx
        console.error('[TeacherPassword] Login failed:', fetchErr);
        // fetchErr.message already contains backend's `error` field
        throw new Error(fetchErr.message || 'Login failed');
      }

      console.log('[TeacherPassword] Login response:', data);

      // 3. Validate response shape
      if (!data) {
        throw new Error('Empty response from server. Check backend /api/auth/teacher/login.');
      }
      if (!data.token) {
        throw new Error(
          'Server did not return a token. Backend routes/auth.js must return { token, user }.'
        );
      }
      if (!data.user) {
        throw new Error(
          'Server did not return a user object. Backend must include user: { role: "teacher", tid, tcode, ... }.'
        );
      }
      if (data.user.role !== 'teacher') {
        throw new Error(
          `Server returned role "${data.user.role || 'undefined'}". Expected "teacher". ` +
          `Update routes/auth.js to include role: 'teacher' inside the user object.`
        );
      }

      // 4. Validate token payload
      let payload;
      try {
        payload = JSON.parse(atob(data.token.split('.')[1]));
      } catch {
        throw new Error('Token returned by server is not a valid JWT.');
      }
      if (payload.role !== 'teacher') {
        throw new Error(
          `Token payload has role "${payload.role}", expected "teacher". ` +
          `Backend signToken() must include role: 'teacher'.`
        );
      }
      if (!payload.tid) {
        throw new Error(
          'Token payload is missing tid (teacher ID). ' +
          'Backend teacher login must include tid: t.tid when signing.'
        );
      }

      // 5. Store auth via context (which delegates to client.js)
      const authObj = {
        token: data.token,
        user: data.user,
      };

      if (typeof setAuth === 'function') {
        setAuth(authObj);
      } else {
        // Fallback if context is broken
        setStoredAuth(authObj);
      }

      // 6. Verify storage actually saved correctly
      const stored = localStorage.getItem('school_portal_auth');
      if (!stored) {
        throw new Error('Failed to store auth. localStorage may be blocked.');
      }
      const parsed = JSON.parse(stored);
      if (parsed.token !== data.token) {
        throw new Error('Stored token does not match server token. Something overwrote it.');
      }

      console.log('[TeacherPassword] ✅ Auth stored. Navigating to dashboard.');

      // 7. Navigate
      navigate('/teacher/dashboard', { replace: true });
    } catch (err) {
      console.error('[TeacherPassword] ❌', err);
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Teacher password</h2>
        <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
          Signing in as <code>{tcode}</code>
        </p>

        {error ? (
          <div
            className="alert-error"
            style={{
              background: '#fee',
              color: '#900',
              padding: '10px 12px',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoFocus
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-green"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', fontSize: 13 }}>
          <Link to="/login/teacher">← Use a different teacher code</Link>
        </p>
      </div>
    </div>
  );
}