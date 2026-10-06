import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TeacherPassword() {
  const loc = useLocation();
  const tcode = loc.state?.tcode || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tcode) navigate('/login/teacher', { replace: true });
  }, [tcode, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/api/auth/teacher/login', {
        method: 'POST',
        body: JSON.stringify({ tcode, password }),
      });
      setAuth({ role: 'teacher', token: data.token, user: data.user });
      navigate('/teacher/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Teacher password</h2>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-green">
            Sign in
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: 14 }}>
          <Link to="/login/teacher/create-password">Create password</Link> · <Link to="/login/teacher">Different code</Link>
        </p>
      </div>
    </div>
  );
}
