// middleware/auth.js
const jwt = require('jsonwebtoken');

function requireAuth(allowedRoles) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: no token' });
    }

    let payload;
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: err.name === 'TokenExpiredError'
          ? 'Unauthorized: token expired — please log in again'
          : 'Unauthorized: invalid token',
      });
    }

    // ✅ FIX #1: Normalize role casing
    const rawRole = payload.role || payload.userRole || payload.user_type || '';
    const normalized = String(rawRole).toLowerCase().trim();
    if (normalized) payload.role = normalized;

    // ✅ FIX #2: Only return 403 if role TRULY doesn't match after normalization
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(normalized)) {
        // Special case: any role='teacher' variant + tid/tcode → treat as teacher
        const looksLikeTeacher =
          allowedRoles.includes('teacher') &&
          (payload.tid || payload.tcode);
        if (!looksLikeTeacher) {
          return res.status(403).json({
            error: `Forbidden: requires ${allowedRoles.join('/')}, got '${normalized || 'none'}'`,
          });
        }
        payload.role = 'teacher';
      }
    }

    req.user = payload;
    next();
  };
}

function adminPosition(user) {
  const raw = user.position ?? user.postion;
  if (raw == null || raw === '') return null;
  return Number(raw);
}

function requireAdminFull(req, res, next) {
  requireAuth(['admin'])(req, res, () => {
    if (adminPosition(req.user) === 3) {
      return res.status(403).json({ error: 'This account uses the DoD portal at /dod.' });
    }
    next();
  });
}

function requireDodAdmin(req, res, next) {
  requireAuth(['admin'])(req, res, () => {
    if (adminPosition(req.user) !== 3) {
      return res.status(403).json({ error: 'DoD portal is only for position 3 admin accounts.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdminFull, requireDodAdmin, adminPosition };