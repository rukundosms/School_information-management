import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function TeacherCreatePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const tcode = location.state?.tcode || '';

  if (!tcode) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
          <div className="alert-error">Session expired. Please start over.</div>
          <Link to="/login/teacher">← Back to teacher code</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/auth/teacher/create-password', {
        method: 'POST',
        body: JSON.stringify({ tcode, password }),
      });
      navigate('/login/teacher/password', {
        state: { tcode },
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Could not create password');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Create teacher password</h2>
        <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>
          First time signing in as <code>{tcode}</code>
        </p>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-green" disabled={loading}>
            {loading ? 'Creating...' : 'Create password'}
          </button>
        </form>
      </div>
    </div>
  );
}