export default function StatCard({ title, value, subtitle, icon, color, progress, onClick }) {
  const colors = {
    green: 'border-l-4 border-green-500',
    blue: 'border-l-4 border-blue-500',
    yellow: 'border-l-4 border-yellow-500',
    red: 'border-l-4 border-red-500',
    orange: 'border-l-4 border-orange-500',
  };

  const bar = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-transform hover:-translate-y-1 cursor-pointer ${colors[color] || colors.green}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-600 font-semibold">{title}</h3>
        <i className={`fas fa-${icon} text-2xl text-${color}-600`} />
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
      {subtitle && <p className="text-gray-500 text-sm mb-3">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${bar[color] || bar.green}`}
              style={{ width: `${Math.min(100, Number(progress) || 0)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{Math.min(100, Number(progress) || 0).toFixed(1)}% complete</p>
        </div>
      )}
    </div>
  );
}
