const express = require('express');
const app = express();

const requestTracker = new Map();
const RATE_LIMIT = 5; // Max 5 requests
const WINDOW_MS = 60 * 1000; // Per 1 minute window

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestTracker.has(ip)) {
    requestTracker.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  const record = requestTracker.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return next();
  }

  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  record.count++;
  next();
};

app.use('/api/', rateLimiter);

app.get('/api/resource', (req, res) => {
  res.json({ message: 'Access granted! You are within your rate limit.' });
});

app.listen(3000, () => console.log('Rate-limited API running on http://localhost:3000'));
