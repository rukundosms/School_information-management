import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherHome() {
  const [teacher, setTeacher] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teacher/me')
      .then((d) => setTeacher(d.teacher))
      .catch((e) => setError(e.message));
    apiFetch('/api/teacher/assessments')
      .then((d) => setAssessments(d.assessments || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-school border-b-2 border-school pb-2">Teacher dashboard</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      {teacher && (
        <div className="rounded-lg bg-white shadow border-l-4 border-school p-5">
          <p className="text-lg font-semibold text-school">
            {teacher.fname} {teacher.lname}
          </p>
          <p className="text-gray-600 text-sm">Code: {teacher.tcode}</p>
        </div>
      )}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="border-b-2 border-school px-4 py-3 font-bold text-school flex justify-between items-center">
          <span>Recent assessments</span>
          <Link to="/teacher/manage-assessments" className="text-sm text-school-bright hover:underline">
            Manage →
          </Link>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Submissions</th>
                <th className="py-2">Questions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 10).map((a) => (
                <tr key={a.assessment_id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{a.title}</td>
                  <td className="py-2 pr-4">{a.status}</td>
                  <td className="py-2 pr-4">{a.total_submissions}</td>
                  <td className="py-2">{a.total_questions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
