import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function TeacherCreatePassword() {
  const loc = useLocation();
  const tcode = loc.state?.tcode || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!tcode) navigate('/login/teacher', { replace: true });
  }, [tcode, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/auth/teacher/create-password', {
        method: 'POST',
        body: JSON.stringify({ tcode, password }),
      });
      navigate('/login/teacher/password', { state: { tcode }, replace: true });
    } catch (err) {
      setError(err.message || 'Failed');
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Create password</h2>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
          </div>
          <button type="submit" className="btn btn-green">
            Save
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: 14 }}>
          <Link to="/login/teacher/password">Already set — login</Link>
        </p>
      </div>
    </div>
  );
}
