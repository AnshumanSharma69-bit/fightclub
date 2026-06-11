const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
require('dotenv').config();

const authRoutes    = require('./routes/auth.routes');
const fighterRoutes = require('./routes/fighter.routes');

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────

// helmet sets secure HTTP headers (XSS protection, no sniff, etc.) automatically
app.use(helmet());

// morgan logs every request to the console: "POST /api/auth/register 201 45ms"
// 'dev' format is colorful and concise — good for development
app.use(morgan('dev'));

// Parse incoming JSON request bodies (req.body)
app.use(express.json());

// CORS: allow your Next.js frontend to talk to this server
// In production, replace the origin with your actual Vercel URL
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // needed if you ever send cookies
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/fighter', fighterRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
// Render and other hosts ping this to confirm the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
// Catches any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Express calls this whenever next(err) is called anywhere in the app.
// Having ONE place to handle errors keeps controllers clean.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error (e.g. missing required field)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // Mongoose duplicate key error (e.g. username already taken)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} is already taken` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Default: 500 Internal Server Error
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
