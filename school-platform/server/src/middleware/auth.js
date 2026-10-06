const jwt = require('jsonwebtoken');

function requireAuth(allowedRoles) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

function adminPosition(user) {
  const raw = user.position ?? user.postion;
  if (raw == null || raw === '') return null;
  return Number(raw);
}

function requireAdminFull(req, res, next) {
  const chain = requireAuth(['admin']);
  chain(req, res, () => {
    if (adminPosition(req.user) === 3) {
      return res.status(403).json({ error: 'This account uses the DoD portal at /dod.' });
    }
    next();
  });
}

function requireDodAdmin(req, res, next) {
  const chain = requireAuth(['admin']);
  chain(req, res, () => {
    if (adminPosition(req.user) !== 3) {
      return res.status(403).json({ error: 'DoD portal is only for position 3 admin accounts.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdminFull, requireDodAdmin, adminPosition };
