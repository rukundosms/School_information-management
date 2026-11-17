// server/src/signaling.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Attach Socket.IO to the HTTP server.
 * Returns the io instance (or a no-op fallback if setup fails).
 */
function attachSignaling(server) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // ============================================================
  // SOCKET AUTH MIDDLEWARE
  // Accepts JWT from auth.token, query.token, or Authorization header.
  // Populates socket.request.user — REQUIRED for room joins.
  // ============================================================
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        // Anonymous socket — allowed but won't get any personal rooms.
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.request.user = decoded;
      next();
    } catch (err) {
      // Don't hard-fail the connection; some signaling paths are anonymous.
      console.warn('[socket auth]', err.message);
      next();
    }
  });

  // ============================================================
  // ROOM REGISTRATION
  // Called from index.js after attachSignaling() to join sockets
  // to their personal rooms and assessment subscription rooms.
  // ============================================================
  io.on('connection', (socket) => {
    const user = socket.request?.user || null;

    if (user?.sid) socket.join(`student-${user.sid}`);
    if (user?.tid) socket.join(`teacher-${user.tid}`);

    socket.on('subscribe-assessment', ({ assessment_id } = {}) => {
      const sid = user?.sid;
      if (sid && assessment_id) {
        const room = `assessment-${assessment_id}-${sid}`;
        socket.join(room);
        console.log(`[socket] sid=${sid} joined ${room}`);
      }
    });

    socket.on('unsubscribe-assessment', ({ assessment_id } = {}) => {
      const sid = user?.sid;
      if (sid && assessment_id) {
        socket.leave(`assessment-${assessment_id}-${sid}`);
      }
    });

    // ---- Online-class helpers (kept compatible with existing UI) ----
    socket.on('join-class', ({ classId } = {}) => {
      if (classId) socket.join(`class-${classId}`);
    });

    socket.on('leave-class', ({ classId } = {}) => {
      if (classId) socket.leave(`class-${classId}`);
    });

    socket.on('disconnect', () => {
      // Socket.IO auto-cleans rooms.
    });
  });

  // ============================================================
  // OUTBOUND HELPERS (used by routes)
  // ============================================================
  io.emitClassStarted = (classId, payload = {}) => {
    io.to(`class-${classId}`).emit('class-started', { classId, ...payload });
  };
  io.emitClassEnded = (classId, payload = {}) => {
    io.to(`class-${classId}`).emit('class-ended', { classId, ...payload });
  };
  io.kickStudent = (classId, sid) => {
    io.to(`student-${sid}`).emit('kicked', { classId });
  };

  return io;
}

module.exports = { attachSignaling };