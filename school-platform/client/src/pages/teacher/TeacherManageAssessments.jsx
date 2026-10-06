import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function TeacherManageAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teacher/assessments')
      .then((d) => setAssessments(d.assessments || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-school">Manage assessments</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Submissions</th>
              <th className="px-4 py-2">Questions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.assessment_id} className="border-t">
                <td className="px-4 py-2">{a.title}</td>
                <td className="px-4 py-2">{a.status}</td>
                <td className="px-4 py-2">{a.total_submissions}</td>
                <td className="px-4 py-2">{a.total_questions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
