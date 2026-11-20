// src/pages/student/StudentLogin.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setStoredAuth, clearStoredAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StudentLogin() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState('');

  // Reg lookup result
  const [reg, setReg] = useState('');
  const [lookupResult, setLookupResult] = useState(null); // { login_ticket, student: {...}, class: {...} }

  // First-name step
  const [firstName, setFirstName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/public/years')
      .then((d) => setYears(d.years || []))
      .catch(() => {});
  }, []);

  // Reset downstream state whenever the year changes
  useEffect(() => {
    setReg('');
    setLookupResult(null);
    setFirstName('');
    setError('');
  }, [yearId]);

  // ---------- STEP 1: look up student by reg ----------
  async function onLookup(e) {
    e.preventDefault();
    setError('');
    setLookupResult(null);
    setFirstName('');

    if (!yearId) return setError('Please select an academic year.');
    if (!reg.trim()) return setError('Please enter your registration number.');

    setLookingUp(true);
    try {
      const data = await apiFetch('/api/auth/student/lookup', {
        method: 'POST',
        body: JSON.stringify({
          year_id: Number(yearId),
          reg: reg.trim(),
        }),
      });

      // Expected shape:
      // { login_ticket, student: { sid, reg, firstname_masked }, class: { cid, level, class_name } }
      if (!data?.login_ticket || !data?.student || !data?.class) {
        throw new Error('Unexpected server response.');
      }

      setLookupResult(data);
    } catch (err) {
      setError(err.message || 'Could not find a student with that registration number in the selected year.');
    } finally {
      setLookingUp(false);
    }
  }

  // ---------- STEP 2: confirm first name ----------
  async function onConfirm(e) {
    e.preventDefault();
    setError('');

    if (!lookupResult?.login_ticket) return setError('Please look up your registration number first.');
    if (!firstName.trim()) return setError('Please enter your first name.');

    setLoading(true);

    // Clear any previously stored auth before attempting login
    clearStoredAuth();

    try {
      const data = await apiFetch('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({
          year_id: Number(yearId),
          login_ticket: lookupResult.login_ticket,
          first_name: firstName.trim(),
        }),
      });

      if (!data?.token || !data?.user) {
        throw new Error('Server did not return a token or user.');
      }
      if (data.user.role !== 'student') {
        throw new Error(`Login returned role "${data.user.role}", expected "student".`);
      }

      // Verify the JWT payload matches expectations
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        if (payload.role !== 'student') throw new Error(`Token role mismatch: ${payload.role}`);
        if (!payload.sid) throw new Error('Token payload missing sid.');
      } catch (decodeErr) {
        clearStoredAuth();
        throw new Error(`Token validation failed: ${decodeErr.message}`);
      }

      setStoredAuth({ token: data.token, user: data.user });
      setAuth?.({ token: data.token, user: data.user });

      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }

  function onReset() {
    setLookupResult(null);
    setFirstName('');
    setError('');
  }

  const currentYear = years.find((y) => String(y.year_id) === String(yearId));

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 480, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Student login</h2>
        {error ? <div className="alert-error">{error}</div> : null}

        {/* ---------- STEP 1: year + reg ---------- */}
        {!lookupResult && (
          <form onSubmit={onLookup}>
            <div className="form-group">
              <label>Academic year</label>
              <select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
                required
                disabled={lookingUp}
              >
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.year_id} value={y.year_id}>
                    {y.year}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Registration number (RegNo)</label>
              <input
                type="text"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="e.g. 2024/S/0123"
                required
                autoComplete="off"
                spellCheck={false}
                disabled={!yearId || lookingUp}
              />
              <small style={{ color: '#666' }}>
                Enter the registration number printed on your student card.
              </small>
            </div>

            <button type="submit" className="btn btn-green" disabled={!yearId || lookingUp}>
              {lookingUp ? 'Looking up…' : 'Continue'}
            </button>
          </form>
        )}

        {/* ---------- STEP 2: confirm first name ---------- */}
        {lookupResult && (
          <form onSubmit={onConfirm}>
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#555' }}>
                Account found for <strong>{currentYear?.year || 'the selected year'}</strong>:
              </div>
              <div style={{ marginTop: 4, fontWeight: 600 }}>
                {lookupResult.class.class_name}
                {lookupResult.class.level ? ` — Level ${lookupResult.class.level}` : ''}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                RegNo: {lookupResult.student.reg}
              </div>
            </div>

            <div className="form-group">
              <label>First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
              <small style={{ color: '#666' }}>
                Type the first name on your school record to confirm identity.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-green" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={onReset}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}