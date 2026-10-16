const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// Mock database stores: apiKey -> { owner, tier, usageCount, limit }
const apiKeysDb = new Map();

// Admin endpoint to generate a new key
app.post('/api/admin/keys', (req, res) => {
  const { owner, tier = 'free' } = req.body;
  const apiKey = 'ak_' + crypto.randomBytes(16).toString('hex');
  const limit = tier === 'pro' ? 10000 : 100;

  apiKeysDb.set(apiKey, { owner, tier, usageCount: 0, limit });
  res.status(201).json({ apiKey, tier, limit });
});

// Middleware to enforce API key validity and quotas
const verifyApiKeyAndQuota = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !apiKeysDb.has(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
  }

  const clientData = apiKeysDb.get(apiKey);
  if (clientData.usageCount >= clientData.limit) {
    return res.status(429).json({ error: 'Quota exceeded. Upgrade your plan for higher limits.' });
  }

  clientData.usageCount++;
  req.client = clientData;
  next();
};

app.get('/api/data', verifyApiKeyAndQuota, (req, res) => {
  res.json({
    message: 'Welcome to the protected data endpoint!',
    tier: req.client.tier,
    remainingQuota: req.client.limit - req.client.usageCount
  });
});

app.listen(3000, () => console.log('API Key Manager running on http://localhost:3000'));
