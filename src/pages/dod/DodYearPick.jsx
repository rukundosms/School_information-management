import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function DodYearPick() {
  const { cid } = useParams();
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dod/years')
      .then((d) => setYears(d.years || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/dod" className="text-sm font-semibold text-school hover:underline mb-4 inline-block">
        ← Classes
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose year</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm mb-4">{error}</div> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {years.map((y) => (
          <button
            key={y.year_id}
            type="button"
            onClick={() => navigate(`/dod/class/${cid}/year/${y.year_id}`)}
            className="rounded-lg bg-school-bright hover:bg-school text-white font-semibold text-lg py-6 px-4 shadow-md"
          >
            {y.year}
            {y.status === 'active' ? <span className="block text-xs text-yellow-200 mt-1">Current</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
