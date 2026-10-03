const express = require("express");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3004;

const db = new Database("urls.db");

app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

function createShortCode(length = 6) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomBytes = crypto.randomBytes(length);

  let code = "";

  for (let index = 0; index < length; index++) {
    code += characters[randomBytes[index] % characters.length];
  }

  return code;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" ||
      url.protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "URL Shortener API",
    endpoints: [
      "POST /api/shorten",
      "GET /api/urls"
    ]
  });
});

app.post("/api/shorten", (req, res) => {
  const { originalUrl, customCode } = req.body;

  if (!originalUrl || !isValidUrl(originalUrl)) {
    return res.status(400).json({
      error: "A valid HTTP or HTTPS URL is required"
    });
  }

  let shortCode = customCode
    ? String(customCode).trim()
    : createShortCode();

  if (!/^[A-Za-z0-9_-]{3,20}$/.test(shortCode)) {
    return res.status(400).json({
      error: "Code must contain 3 to 20 letters, numbers, underscores or hyphens"
    });
  }

  const existingCode = db
    .prepare("SELECT id FROM urls WHERE short_code = ?")
    .get(shortCode);

  if (existingCode) {
    if (customCode) {
      return res.status(409).json({
        error: "This custom code is already in use"
      });
    }

    shortCode = createShortCode();
  }

  const result = db
    .prepare(`
      INSERT INTO urls (short_code, original_url)
      VALUES (?, ?)
    `)
    .run(shortCode, originalUrl);

  res.status(201).json({
    id: result.lastInsertRowid,
    originalUrl,
    shortCode,
    shortUrl: `http://localhost:${PORT}/${shortCode}`
  });
});

app.get("/api/urls", (req, res) => {
  const urls = db
    .prepare(`
      SELECT
        id,
        short_code,
        original_url,
        clicks,
        created_at
      FROM urls
      ORDER BY created_at DESC
    `)
    .all();

  res.json(urls);
});

app.get("/:shortCode", (req, res) => {
  const url = db
    .prepare(`
      SELECT *
      FROM urls
      WHERE short_code = ?
    `)
    .get(req.params.shortCode);

  if (!url) {
    return res.status(404).send("Short URL not found");
  }

  db.prepare(`
    UPDATE urls
    SET clicks = clicks + 1
    WHERE id = ?
  `).run(url.id);

  res.redirect(url.original_url);
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`URL shortener running at http://localhost:${PORT}`);
});