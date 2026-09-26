const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3051;

app.use(cors());
app.use(express.json());

// Simulated API key database
const API_KEYS = {
  'key-free': { name: 'Free Tier', limit: 5, windowMs: 60000 },      // 5 req/min
  'key-pro': { name: 'Pro Tier', limit: 50, windowMs: 60000 },       // 50 req/min
  'key-unlimited': { name: 'Unlimited', limit: Infinity, windowMs: 60000 }
};

// In-memory rate limit store
const rateLimitStore = {};

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !API_KEYS[apiKey]) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  const keyConfig = API_KEYS[apiKey];
  const now = Date.now();
  const windowStart = now - keyConfig.windowMs;

  // Initialize or clean old entries
  if (!rateLimitStore[apiKey]) {
    rateLimitStore[apiKey] = [];
  }
  rateLimitStore[apiKey] = rateLimitStore[apiKey].filter(ts => ts > windowStart);

  // Check limit
  if (rateLimitStore[apiKey].length >= keyConfig.limit) {
    const retryAfter = Math.ceil((rateLimitStore[apiKey][0] + keyConfig.windowMs - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter,
      tier: keyConfig.name
    });
  }

  // Record this request
  rateLimitStore[apiKey].push(now);
  req.apiKey = apiKey;
  req.tier = keyConfig.name;
  
  // Set headers for client
  res.setHeader('X-RateLimit-Limit', keyConfig.limit);
  res.setHeader('X-RateLimit-Remaining', keyConfig.limit - rateLimitStore[apiKey].length);
  
  next();
};

// Apply rate limiter to all /api routes
app.use('/api', rateLimiter);

// Mock backend endpoints
app.get('/api/users', (req, res) => {
  res.json({
    data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
    tier: req.tier
  });
});

app.get('/api/posts', (req, res) => {
  res.json({
    data: [{ id: 1, title: 'Hello World' }],
    tier: req.tier
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    message: 'Protected stats endpoint',
    accessedBy: req.tier,
    timestamp: new Date().toISOString()
  });
});

// Public endpoint (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Info endpoint to show available keys
app.get('/docs', (req, res) => {
  res.json({
    message: 'API Gateway with Rate Limiting',
    usage: 'Include header: X-API-Key: <key>',
    keys: Object.entries(API_KEYS).map(([key, config]) => ({
      key,
      name: config.name,
      limit: config.limit === Infinity ? 'Unlimited' : `${config.limit} req/${config.windowMs/1000}s`
    }))
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log('Visit /docs to see available API keys');
});