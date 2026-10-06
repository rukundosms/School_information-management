import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function AdminStudentClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/classes-admin')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-2">
      <h1 className="text-2xl font-bold text-school mb-6">Students by class</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm mb-4">{error}</div> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {classes.map((c) => (
          <Link
            key={c.cid}
            to={`/admin/students/class/${c.cid}`}
            className="rounded-lg border-2 border-school-bright text-school font-bold text-center py-4 hover:bg-school hover:text-white transition-colors"
          >
            {c.level} {c.class_name}
          </Link>
        ))}
      </div>
    </div>
  );
}
