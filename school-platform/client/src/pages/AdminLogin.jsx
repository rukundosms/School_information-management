import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuth({
        role: 'admin',
        token: data.token,
        user: data.user,
      });
      navigate(data.user.redirect === 'dod' ? '/dod' : '/admin/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Admin login</h2>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-green">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
