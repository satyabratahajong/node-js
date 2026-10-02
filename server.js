const express = require('express');
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware');

const app = express();
const PORT = process.env.PORT || 3090;

app.use(express.json());

// Apply rate limiter globally
app.use(rateLimitMiddleware);

// Test endpoints
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Here is your data',
    timestamp: new Date().toISOString(),
    data: [1, 2, 3, 4, 5]
  }); 
});

app.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ]
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Rate Limiter API running on http://localhost:${PORT}`);
  console.log(`Limit: 10 requests per minute per IP`);
});