const express = require('express');
const Device = require('../models/Device');
const Reading = require('../models/Reading');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { deviceId, apiKey, temperature, humidity, batteryVoltage } = req.body;
    if (!deviceId || !apiKey) {
      return res.status(400).json({ error: 'deviceId and apiKey required' });
    }

    const device = await Device.findOne({ deviceId, apiKey });
    if (!device) return res.status(401).json({ error: 'Invalid device or API key' });

    const reading = new Reading({
      device: device._id,
      deviceId,
      temperature,
      humidity,
      batteryVoltage
    });
    await reading.save();

    res.status(201).json({ status: 'ok', readingId: reading._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/aggregate/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const stats = await Reading.aggregate([
      { $match: { deviceId } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          avgTemp: { $avg: '$temperature' },
          maxTemp: { $max: '$temperature' },
          minTemp: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgBattery: { $avg: '$batteryVoltage' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;