import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setStoredAuth, clearStoredAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StudentLogin() {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/public/years')
      .then((d) => setYears(d.years || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!yearId) {
      setClasses([]);
      return;
    }
    apiFetch(`/api/public/classes?year_id=${yearId}`)
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, [yearId]);

  useEffect(() => {
    if (!classId || !yearId) {
      setStudents([]);
      return;
    }
    apiFetch(`/api/public/students?class_id=${classId}&year_id=${yearId}`)
      .then((d) => setStudents(d.students || []))
      .catch(() => setStudents([]));
  }, [classId, yearId]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ✅ FIX #1: Clear ANY previous auth BEFORE attempting login
    // This is what prevents the "logged in as opposite role" bug.
    clearStoredAuth();

    try {
      const data = await apiFetch('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({
          year_id: Number(yearId),
          class_id: Number(classId),
          student_id: Number(studentId),
        }),
      });

      // ✅ FIX #2: Validate the response is what we expect
      if (!data?.token || !data?.user) {
        throw new Error('Server did not return a token or user');
      }
      if (data.user.role !== 'student') {
        throw new Error(`Login returned role "${data.user.role}", expected "student"`);
      }

      // ✅ FIX #3: Store via the SAME key that apiFetch reads from
      setStoredAuth({
        token: data.token,
        user: data.user,
      });

      // ✅ FIX #4: Update React context (for UI re-renders), but do NOT
      // let context re-store to localStorage. Context just reads from
      // what we already stored.
      setAuth?.({
        token: data.token,
        user: data.user,
      });

      // ✅ FIX #5: Verify the token we stored actually decodes correctly
      // (fails fast if something corrupted it)
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        if (payload.role !== 'student') {
          throw new Error(`Token payload has role "${payload.role}", expected "student"`);
        }
        if (!payload.sid) {
          throw new Error('Token payload missing sid (student ID)');
        }
      } catch (decodeErr) {
        clearStoredAuth();
        throw new Error(`Token validation failed: ${decodeErr.message}`);
      }

      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 440, margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Student login</h2>
        {error ? <div className="alert-error">{error}</div> : null}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Academic year</label>
            <select value={yearId} onChange={(e) => setYearId(e.target.value)} required disabled={loading}>
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.year_id} value={y.year_id}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required disabled={!yearId || loading}>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.cid} value={c.cid}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={!classId || loading}>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.sid} value={s.sid}>
                  {s.name} ({s.reg})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-green" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}