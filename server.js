const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// In-memory store: shortId -> { originalUrl, clicks }
const urlDatabase = new Map();

app.post('/api/shorten', (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) return res.status(400).json({ error: 'originalUrl is required' });

  const shortId = crypto.randomBytes(4).toString('hex');
  urlDatabase.set(shortId, { originalUrl, clicks: 0 });

  res.status(201).json({
    shortId,
    shortUrl: `http://localhost:3000/${shortId}`
  });
});

app.get('/:shortId', (req, res) => {
  const record = urlDatabase.get(req.params.shortId);
  if (!record) return res.status(404).send('URL not found');

  record.clicks++;
  res.redirect(record.originalUrl);
});

app.get('/api/stats/:shortId', (req, res) => {
  const record = urlDatabase.get(req.params.shortId);
  if (!record) return res.status(404).json({ error: 'URL not found' });
  res.json({ originalUrl: record.originalUrl, clicks: record.clicks });
});

app.listen(3000, () => console.log('URL Shortener running on http://localhost:3000'));
