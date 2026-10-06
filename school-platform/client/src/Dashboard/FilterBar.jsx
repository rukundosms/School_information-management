export default function FilterBar({ filters, setFilters, data, onApply, onReset }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Year</label>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.year_id}
          onChange={(e) => setFilters({ ...filters, year_id: e.target.value })}
        >
          <option value="">Active (default)</option>
          {(data?.years || []).map((y) => (
            <option key={y.year_id} value={y.year_id}>
              {y.year}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Term</label>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.term}
          onChange={(e) => setFilters({ ...filters, term: Number(e.target.value) })}
        >
          {[1, 2, 3].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={onApply} className="bg-school text-white px-4 py-2 rounded-lg text-sm font-semibold">
        Apply
      </button>
      <button type="button" onClick={onReset} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">
        Reset
      </button>
    </div>
  );
}
