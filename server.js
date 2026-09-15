const express = require('express');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const router = express.Router();

router.post('/shorten', async (req, res) => {
  try {
    const { url, customAlias } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    if (!/^https?:\/\/.+/i.test(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    let shortCode = customAlias || nanoid(6);
    let existing = await Url.findOne({ shortCode });
    if (existing && !customAlias) {
      shortCode = nanoid(6);
    } else if (existing && customAlias) {
      return res.status(409).json({ error: 'Alias already taken' });
    }

    const record = new Url({ originalUrl: url, shortCode });
    await record.save();

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    res.status(201).json({ shortUrl, shortCode, originalUrl: url });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats/:code', async (req, res) => {
  try {
    const record = await Url.findOne({ shortCode: req.params.code });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({
      shortCode: record.shortCode,
      originalUrl: record.originalUrl,
      clicks: record.clicks,
      lastClickedAt: record.lastClickedAt,
      createdAt: record.createdAt
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;