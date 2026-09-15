const express = require('express');
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const Reading = require('../models/Reading');
const crypto = require('crypto');
const router = express.Router();

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', auth, async (req, res) => {
  try {
    const { name, deviceId } = req.body;
    if (!name || !deviceId) return res.status(400).json({ error: 'name and deviceId required' });

    const existing = await Device.findOne({ deviceId });
    if (existing) return res.status(409).json({ error: 'Device ID already registered' });

    const apiKey = crypto.randomBytes(16).toString('hex');
    const device = new Device({ name, deviceId, apiKey, owner: req.userId });
    await device.save();

    res.status(201).json({ deviceId: device.deviceId, apiKey });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.userId }).select('-apiKey');
    res.json(devices);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:deviceId/readings', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { from, to, limit = 100 } = req.query;
    const query = { deviceId };
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    const readings = await Reading.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json(readings);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;