import { Link } from 'react-router-dom';

const MODULES = [
  { name: 'PHP legacy files', php: ['home.php', 'dod.php', 'user.php', 'student_dashboard.php'] },
];

export default function ModuleMap() {
  return (
    <div className="page">
      <h1>Module map</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 720 }}>
        Reference list while porting features from the PHP project.
      </p>
      <p>
        <Link to="/">← Home</Link>
      </p>
      {MODULES.map((m) => (
        <div key={m.name} className="card">
          <h3 style={{ marginTop: 0 }}>{m.name}</h3>
          <ul>
            {m.php.map((p) => (
              <li key={p}>
                <code>{p}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
