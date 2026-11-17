import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, clearStoredAuth } from '../api/client';

export default function TeacherCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ✅ FIX: Clear any stale auth before starting a new teacher login flow
    // This guarantees the teacher flow can never "inherit" a student session.
    clearStoredAuth();

    try {
      const trimmed = code.trim();
      if (!trimmed) throw new Error('Teacher code required');

      const status = await apiFetch(
        `/api/auth/teacher/status?tcode=${encodeURIComponent(trimmed)}`
      );

      if (!status.userRowExists) {
        await apiFetch('/api/auth/teacher/init-user', {
          method: 'POST',
          body: JSON.stringify({ tcode: trimmed }),
        });
        navigate('/login/teacher/create-password', {
          state: { tcode: trimmed },
          replace: true,
        });
        return;
      }

      if (!status.hasPassword) {
        navigate('/login/teacher/create-password', {
          state: { tcode: trimmed },
          replace: true,
        });
        return;
      }

      navigate('/login/teacher/password', {
        state: { tcode: trimmed },
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Invalid code');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Teacher code</h2>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Teacher code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-green" disabled={loading}>
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: 14 }}>
          <Link to="/">← Home</Link>
        </p>
      </div>
    </div>
  );
}