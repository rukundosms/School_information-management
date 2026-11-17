export default function DashboardModal({ isOpen, onClose, title, content, exportData }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button type="button" className="text-gray-500 hover:text-gray-800 p-2" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1" dangerouslySetInnerHTML={{ __html: content || '' }} />
        {exportData?.rows?.length ? (
          <div className="px-4 py-2 border-t text-xs text-gray-500">Export: {exportData.filename}</div>
        ) : null}
      </div>
    </div>
  );
}
