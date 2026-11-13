import { Link } from 'react-router-dom';

export default function PhpPlaceholder({ title, phpFile, description, backTo, backLabel }) {
  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-100 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-school-bright mb-1">Legacy module</p>
        <h1 className="text-2xl font-bold text-school mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">
          {description ||
            'Port this PHP screen to React + API when ready. The menu link is wired so nothing is missing from navigation.'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          PHP reference: <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">{phpFile}</code>
        </p>
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-lg bg-school px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-school-dark transition-colors"
          >
            <i className="fas fa-arrow-left" aria-hidden />
            {backLabel || 'Back'}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
