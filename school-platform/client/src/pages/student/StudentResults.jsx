import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function StudentResults() {
  const [data, setData] = useState({ results: [], overall: {} });
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/student/results')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const o = data.overall || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-school">My results</h1>
      {error ? <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm">{error}</div> : null}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-school">
          <div className="text-2xl font-bold text-school">{o.total_assessments ?? 0}</div>
          <div className="text-xs text-gray-600">Graded</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-amber-400">
          <div className="text-2xl font-bold text-school">{o.avg_percentage != null ? Number(o.avg_percentage).toFixed(1) : '—'}%</div>
          <div className="text-xs text-gray-600">Avg %</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-school-bright">
          <div className="text-2xl font-bold text-school">
            {o.total_obtained ?? '—'} / {o.total_possible ?? '—'}
          </div>
          <div className="text-xs text-gray-600">Total marks</div>
        </div>
      </div>
      <div className="space-y-3">
        {(data.results || []).map((r) => (
          <div key={r.assessment_id} className="bg-white rounded-lg shadow p-4">
            <div className="font-semibold">{r.title}</div>
            <div className="text-sm text-gray-600 mt-1">
              Score: {r.obtained_marks} / {r.total_marks}
            </div>
            {r.feedback ? <p className="text-sm mt-2">{r.feedback}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
