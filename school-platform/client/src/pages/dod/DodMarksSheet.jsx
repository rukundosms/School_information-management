import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function DodMarksSheet() {
  const { cid, yearId, term } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = new URLSearchParams({ cid, year_id: yearId, term });
    apiFetch(`/api/dod/marks-sheet?${q}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [cid, yearId, term]);

  const label = data?.classInfo ? `${data.classInfo.level || ''}${data.classInfo.class_name || ''}` : 'Class';

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/dod/class/${cid}/year/${yearId}`} className="text-sm font-semibold text-school hover:underline mb-4 inline-block">
        ← Terms
      </Link>
      <h1 className="text-xl font-bold text-school mb-1">{label}</h1>
      <p className="text-gray-600 text-sm mb-4">
        Term {term} · Year id {yearId}
      </p>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm mb-4">{error}</div> : null}
      {!data && !error ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : null}
      {data ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-school text-white">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Names</th>
                <th className="px-3 py-2 text-left">Reg</th>
                <th className="px-3 py-2 text-left">Marks</th>
              </tr>
            </thead>
            <tbody>
              {(data.students || []).map((s, i) => (
                <tr key={s.sid} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2">{s.reg || '—'}</td>
                  <td className="px-3 py-2">{s.mark != null && s.mark !== '' ? s.mark : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
