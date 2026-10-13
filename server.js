const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/api/scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Please provide a target URL via ?url=https://example.com' });
  }

  try {
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);

    const headings = [];
    $('h1, h2, h3').each((i, el) => {
      headings.push($(el).text().trim());
    });

    res.json({
      scrapedUrl: targetUrl,
      pageTitle: $('title').text(),
      headingsCount: headings.length,
      headings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scrape target URL', details: err.message });
  }
});

app.listen(3000, () => console.log('Scraper API running on http://localhost:3000'));
