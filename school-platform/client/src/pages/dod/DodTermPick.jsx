import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function DodTermPick() {
  const { cid, yearId } = useParams();
  const navigate = useNavigate();
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    apiFetch('/api/dod/terms')
      .then((d) => setTerms(d.terms || [1, 2, 3]))
      .catch(() => setTerms([1, 2, 3]));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/dod/class/${cid}`} className="text-sm font-semibold text-school hover:underline mb-4 inline-block">
        ← Years
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose term</h1>
      <div className="flex flex-wrap justify-center gap-4">
        {terms.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => navigate(`/dod/class/${cid}/year/${yearId}/term/${t}`)}
            className="w-40 h-24 rounded-lg shadow-lg border-0 bg-white text-school text-xl font-bold hover:bg-school hover:text-white transition-colors"
          >
            Term {t}
          </button>
        ))}
      </div>
    </div>
  );
}
