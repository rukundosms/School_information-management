import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/assessments')
      .then((d) => setAssessments(d.assessments || []))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-school mb-4">Assessments</h1>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Marks</th>
                <th>Questions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.assessment_id}>
                  <td>{a.title}</td>
                  <td>{a.submission_status || '—'}</td>
                  <td>{a.obtained_marks != null ? a.obtained_marks : '—'}</td>
                  <td>{a.total_questions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
