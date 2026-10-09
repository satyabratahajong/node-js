// urlShortener.js
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const urlDatabase = new Map();

// POST /shorten - Generate short URL
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) return res.status(400).json({ error: 'URL is required' });

  const id = crypto.randomBytes(3).toString('hex');
  urlDatabase.set(id, { originalUrl, clicks: 0, createdAt: new Date() });

  res.json({ shortUrl: `http://localhost:3000/${id}`, id });
});

// GET /:id - Redirect to destination
app.get('/:id', (req, res) => {
  const record = urlDatabase.get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Short URL not found' });

  record.clicks += 1;
  res.redirect(record.originalUrl);
});

// GET /api/analytics/:id - View stats
app.get('/api/analytics/:id', (req, res) => {
  const record = urlDatabase.get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Short URL not found' });

  res.json(record);
});

app.listen(3000, () => console.log('Shortener API listening on port 3000'));
