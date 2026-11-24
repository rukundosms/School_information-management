// server/src/index.js
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const pool = require('./db');

// ============================================================
// DATABASE MIGRATION
// ============================================================
async function runDatabaseMigrations() {
  console.log('Checking assessment database columns...');

  const requiredColumns = [
    {
      name: 'submit_reason',
      definition: 'VARCHAR(60) NULL'
    },
    {
      name: 'submitted_at',
      definition: 'DATETIME NULL'
    }
  ];

  for (const column of requiredColumns) {
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'assessment_answer_drafts'
         AND COLUMN_NAME = ?`,
      [column.name]
    );

    if (columns.length === 0) {
      console.log(`Adding missing column: ${column.name}`);

      await pool.query(
        `ALTER TABLE assessment_answer_drafts
         ADD COLUMN ${column.name} ${column.definition}`
      );

      console.log(`Successfully added ${column.name}.`);
    } else {
      console.log(`Column already exists: ${column.name}`);
    }
  }

  console.log('Assessment database migration completed.');
}
// Optional production deps — graceful fallback
let pino = null, pinoHttp = null, Sentry = null;
try { pino = require('pino'); pinoHttp = require('pino-http'); } catch {}
try { Sentry = require('@sentry/node'); } catch {}

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');
const dodRoutes = require('./routes/dod');
const teacherRoutes = require('./routes/teacher');

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================
// LOGGER
// ============================================================
const logger = pino ? pino({ level: process.env.LOG_LEVEL || 'info' }) : console;

if (pinoHttp) {
  app.use(pinoHttp({ logger }));
} else if (NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body) {
      const status = res.statusCode;
      const ms = Date.now() - start;
      const m =
        status >= 500 ? '🔴' :
        status === 403 ? '🟠' :
        status === 401 ? '🟡' :
        status >= 400 ? '🟡' : '🟢';
      console.log(
        `${m} ${req.method} ${req.originalUrl} → ${status} (${ms}ms)` +
        (status >= 400 && body?.error ? ` — ${body.error}` : '')
      );
      return originalJson(body);
    };

    res.send = function (body) {
      const status = res.statusCode;
      const ms = Date.now() - start;
      if (status >= 400 && typeof body === 'string') {
        const preview = body.length > 200 ? body.slice(0, 200) + '...' : body;
        console.log(`🟡 ${req.method} ${req.originalUrl} → ${status} (${ms}ms) — ${preview}`);
      }
      return originalSend(body);
    };

    next();
  });
}

// ============================================================
// SENTRY (optional)
// ============================================================
if (Sentry && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_RATE || '0.1'),
  });
  app.use(Sentry.Handlers.requestHandler());
  console.log('[sentry] enabled');
}

// ============================================================
// CORS
// ============================================================
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Client-Timezone',
    'X-Approval-Token',
    'If-Unmodified-Since',
  ],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Retry-After'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================================
// BODY PARSERS
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// STATIC
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================================
// HEALTH
// ============================================================
function healthHandler(_req, res) {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    uptime: process.uptime(),
    env: NODE_ENV,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_io: !!app.get('io'),
    has_sentry: !!(Sentry && process.env.SENTRY_DSN),
    has_logger: !!pinoHttp,
  });
}
app.get('/api/health', healthHandler);
app.get('/api/__health', healthHandler);

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/public', publicRoutes);

// Student authentication FIRST
// Supports registration lookup and first-name confirmation
app.use('/api/auth/student', require('./routes/studentAuth'));

// General authentication AFTER student authentication
app.use('/api/auth', authRoutes);

app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dod', dodRoutes);
app.use('/api/teacher', teacherRoutes);

// ============================================================
// 404
// ============================================================
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Check server.js for the correct prefix (/api/teacher, /api/student, etc.)',
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================
if (Sentry && process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Server error',
    ...(NODE_ENV !== 'production' && err.stack
      ? { stack: err.stack.split('\n').slice(0, 5) }
      : {}),
  });
});

// ============================================================
// HTTP + SOCKET.IO
// ============================================================
const server = http.createServer(app);

let io = null;
try {
  const { attachSignaling } = require('./signaling');
  io = attachSignaling(server);   // ← room joins happen inside signaling.js
  app.set('io', io);
  console.log('✅ Socket.IO signaling attached');
} catch (sigErr) {
  console.error('⚠️  Signaling failed to attach:', sigErr.message);
  io = {
    to: () => ({ emit: () => {} }),
    emit: () => {},
    on: () => {},
    close: () => {},
    emitClassStarted: () => {},
    emitClassEnded: () => {},
    kickStudent: () => {},
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  };
  app.set('io', io);
}

// ============================================================
// START
// ============================================================
// ============================================================
// START SERVER AFTER DATABASE MIGRATIONS
// ============================================================
async function startServer() {
  try {
    await runDatabaseMigrations();

    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('═'.repeat(60));
      console.log(`✅ School API + Socket.IO listening on http://localhost:${PORT}`);
      console.log(`   Bind:        0.0.0.0:${PORT} (all interfaces)`);
      console.log(`   Env:         ${NODE_ENV}`);
      console.log(`   JWT_SECRET:  ${process.env.JWT_SECRET ? '✅ set' : '❌ missing'}`);
      console.log(`   Signaling:   ${io.emitClassStarted ? '✅ active' : '⚠️  fallback'}`);
      console.log(`   Sentry:      ${Sentry && process.env.SENTRY_DSN ? '✅ enabled' : '— off'}`);
      console.log(`   Health:      http://localhost:${PORT}/api/health`);
      console.log('═'.repeat(60));
      console.log('');
    });
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

startServer();
// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received. Shutting down gracefully...`);

  const timeout = setTimeout(() => {
    console.error('⚠️  Forced shutdown after 10s');
    process.exit(1);
  }, 10000);

  try {
    if (io?.close) {
      await new Promise((resolve) => io.close(resolve));
      console.log('✅ Socket.IO closed');
    }
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ HTTP server closed');
    clearTimeout(timeout);
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    clearTimeout(timeout);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

module.exports = { app, server, io };