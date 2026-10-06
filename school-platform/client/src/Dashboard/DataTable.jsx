/** columnDefs: [{ key: 'name', header: 'Name' }, ...]  rows: [{ name: 'x' }, ...] */
export default function DataTable({ columnDefs, rows }) {
  if (!columnDefs?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            {columnDefs.map((c) => (
              <th key={c.key} className="px-3 py-2 font-semibold text-gray-700">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              {columnDefs.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
