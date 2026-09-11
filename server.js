import express from 'express';

const app = express();
const PORT = 3005;

app.use(express.json());

// In-memory "DB"
const readings = [
  { id: 1, deviceId: 'esp32_1', temperature: 27.3, humidity: 60.1, recordedAt: new Date().toISOString() },
  { id: 2, deviceId: 'esp32_1', temperature: 27.5, humidity: 59.8, recordedAt: new Date().toISOString() }
];
let nextId = 3;

// POST /readings (from device)
app.post('/readings', (req, res) => {
  const { deviceId, temperature, humidity, recordedAt } = req.body;

  if (!deviceId || temperature == null || humidity == null) {
    return res.status(400).json({ error: 'deviceId, temperature, and humidity are required' });
  }

  const reading = {
    id: nextId++,
    deviceId,
    temperature: Number(temperature),
    humidity: Number(humidity),
    recordedAt: recordedAt || new Date().toISOString()
  };

  readings.push(reading);
  res.status(201).json(reading);
});

// GET /readings
app.get('/readings', (req, res) => {
  const { deviceId, from, to, limit } = req.query;

  let result = [...readings];

  if (deviceId) {
    result = result.filter(r => r.deviceId === deviceId);
  }
  if (from) {
    result = result.filter(r => r.recordedAt >= from);
  }
  if (to) {
    result = result.filter(r => r.recordedAt <= to);
  }

  const limitNum = limit ? Number(limit) : result.length;
  result = result.slice(0, limitNum);

  res.json(result);
});

// GET /stats/avg
app.get('/stats/avg', (req, res) => {
  const { deviceId, from, to, group } = req.query;

  let result = [...readings];

  if (deviceId) {
    result = result.filter(r => r.deviceId === deviceId);
  }
  if (from) {
    result = result.filter(r => r.recordedAt >= from);
  }
  if (to) {
    result = result.filter(r => r.recordedAt <= to);
  }

  if (result.length === 0) {
    return res.json({ count: 0, avgTemperature: null, avgHumidity: null });
  }

  const count = result.length;
  const avgTemperature = result.reduce((s, r) => s + r.temperature, 0) / count;
  const avgHumidity = result.reduce((s, r) => s + r.humidity, 0) / count;

  // Very simple grouping: "hour" or "day" just returns overall avg for now
  // You can extend this later to group by hour/day properly.
  res.json({ count, avgTemperature, avgHumidity, group: group || null });
});

app.listen(PORT, () => {
  console.log(`IoT Sensor API running at http://localhost:${PORT}`);
});