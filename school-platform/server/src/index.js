require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');
const dodRoutes = require('./routes/dod');
const teacherRoutes = require('./routes/teacher');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dod', dodRoutes);
app.use('/api/teacher', teacherRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`School API listening on http://localhost:${PORT}`);
});