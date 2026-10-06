import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function TeacherCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const status = await apiFetch(`/api/auth/teacher/status?tcode=${encodeURIComponent(code)}`);
      if (!status.userRowExists) {
        await apiFetch('/api/auth/teacher/init-user', {
          method: 'POST',
          body: JSON.stringify({ tcode: code }),
        });
        navigate('/login/teacher/create-password', { state: { tcode: code }, replace: true });
        return;
      }
      if (!status.hasPassword) {
        navigate('/login/teacher/create-password', { state: { tcode: code }, replace: true });
        return;
      }
      navigate('/login/teacher/password', { state: { tcode: code }, replace: true });
    } catch (err) {
      setError(err.message || 'Invalid code');
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
            <input value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-green">
            Continue
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: 14 }}>
          <Link to="/">← Home</Link>
        </p>
      </div>
    </div>
  );
}
