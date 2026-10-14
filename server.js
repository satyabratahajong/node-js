const express = require('express');
const axios = require('axios');
const app = express();

const cache = new Map();
const TTL_MS = 30 * 1000; // 30-second cache duration

app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Please provide a target URL via ?url=https://...' });
  }

  const now = Date.now();
  if (cache.has(targetUrl)) {
    const cachedItem = cache.get(targetUrl);
    if (now < cachedItem.expiry) {
      return res.json({ source: 'cache', data: cachedItem.data });
    }
    cache.delete(targetUrl); // Expired
  }

  try {
    const response = await axios.get(targetUrl);
    cache.set(targetUrl, { data: response.data, expiry: now + TTL_MS });
    res.json({ source: 'origin', data: response.data });
  } catch (err) {
    res.status(500).json({ error: 'Proxy request failed', details: err.message });
  }
});

app.listen(3000, () => console.log('Caching Proxy running on http://localhost:3000'));
