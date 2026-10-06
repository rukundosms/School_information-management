import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function DodClassList() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dod/classes')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-school mb-6">Class</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm mb-4">{error}</div> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {classes.map((c) => (
          <button
            key={c.cid}
            type="button"
            onClick={() => navigate(`/dod/class/${c.cid}`)}
            className="min-h-[52px] rounded-lg border-2 border-school-bright text-school font-bold uppercase text-sm hover:bg-school hover:text-white transition-colors px-4 py-3"
          >
            {c.level}
            {c.class_name}
          </button>
        ))}
      </div>
    </div>
  );
}
