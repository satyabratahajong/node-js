import express from 'express';

const app = express();
const PORT = 3011;

app.use(express.json());

// In-memory "DB"
const urls = []; // { id, shortCode, originalUrl, clicks, lastClickedAt }
let nextId = 1;

// Simple short code generator
function generateShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /shorten
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'originalUrl is required' });
  }

  // Optional: basic URL validation
  let parsed;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  let shortCode = generateShortCode();
  while (urls.find(u => u.shortCode === shortCode)) {
    shortCode = generateShortCode();
  }

  const entry = {
    id: nextId++,
    shortCode,
    originalUrl,
    clicks: 0,
    lastClickedAt: null
  };

  urls.push(entry);

  const shortUrl = `http://localhost:${PORT}/s/${shortCode}`;
  res.status(201).json({ originalUrl, shortCode, shortUrl });
});

// GET /s/:code (redirect)
app.get('/s/:code', (req, res) => {
  const { code } = req.params;
  const entry = urls.find(u => u.shortCode === code);

  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  entry.clicks += 1;
  entry.lastClickedAt = new Date().toISOString();

  // Redirect to original URL
  res.redirect(entry.originalUrl);
});

// GET /stats/:code
app.get('/stats/:code', (req, res) => {
  const { code } = req.params;
  const entry = urls.find(u => u.shortCode === code);

  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  res.json({
    shortCode: entry.shortCode,
    originalUrl: entry.originalUrl,
    clicks: entry.clicks,
    lastClickedAt: entry.lastClickedAt
  });
});

// GET /urls (list all)
app.get('/urls', (req, res) => {
  res.json(
    urls.map(u => ({
      shortCode: u.shortCode,
      originalUrl: u.originalUrl,
      clicks: u.clicks,
      lastClickedAt: u.lastClickedAt
    }))
  );
});

app.listen(PORT, () => {
  console.log(`URL Shortener API running at http://localhost:${PORT}`);
});