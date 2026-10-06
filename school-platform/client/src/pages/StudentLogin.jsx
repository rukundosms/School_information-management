import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StudentLogin() {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
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
    try {
      const data = await apiFetch('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({
          year_id: Number(yearId),
          class_id: Number(classId),
          student_id: Number(studentId),
        }),
      });
      setAuth({ role: 'student', token: data.token, user: data.user });
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
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
            <select value={yearId} onChange={(e) => setYearId(e.target.value)} required>
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
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required disabled={!yearId}>
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
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={!classId}>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.sid} value={s.sid}>
                  {s.name} ({s.reg})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-green">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
