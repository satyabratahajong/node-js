import express from 'express';

const app = express();
const PORT = 3012;

app.use(express.json());

// In-memory "DB"
const devices = new Map(); // deviceId -> { lastSeen, lastData }
const readings = [];       // { id, deviceId, temperature, humidity, recordedAt }
let nextId = 1;

function ensureDevice(deviceId) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, {
      deviceId,
      lastSeen: null,
      lastData: null
    });
  }
}

// POST /readings (from device)
app.post('/readings', (req, res) => {
  const { deviceId, temperature, humidity, recordedAt } = req.body;

  if (!deviceId || temperature == null || humidity == null) {
    return res.status(400).json({ error: 'deviceId, temperature, and humidity are required' });
  }

  ensureDevice(deviceId);

  const device = devices.get(deviceId);
  const now = recordedAt || new Date().toISOString();

  device.lastSeen = now;
  device.lastData = { temperature: Number(temperature), humidity: Number(humidity) };

  const reading = {
    id: nextId++,
    deviceId,
    temperature: Number(temperature),
    humidity: Number(humidity),
    recordedAt: now
  };

  readings.push(reading);

  res.status(201).json(reading);
});

// GET /devices
app.get('/devices', (req, res) => {
  const list = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    lastSeen: d.lastSeen,
    lastTemperature: d.lastData?.temperature ?? null,
    lastHumidity: d.lastData?.humidity ?? null,
    totalReadings: readings.filter(r => r.deviceId === d.deviceId).length
  }));

  res.json(list);
});

// GET /readings
app.get('/readings', (req, res) => {
  const { deviceId, limit } = req.query;

  let result = [...readings];

  if (deviceId) {
    result = result.filter(r => r.deviceId === deviceId);
  }

  const limitNum = limit ? Number(limit) : 50;
  result = result.slice(-limitNum); // last N readings

  res.json(result);
});

// GET /live (simple "latest snapshot" for dashboard)
app.get('/live', (req, res) => {
  const snapshot = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    lastSeen: d.lastSeen,
    temperature: d.lastData?.temperature ?? null,
    humidity: d.lastData?.humidity ?? null
  }));

  res.json({
    updatedAt: new Date().toISOString(),
    devices: snapshot
  });
});

// GET /stats/:deviceId
app.get('/stats/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  const deviceReadings = readings.filter(r => r.deviceId === deviceId);

  if (deviceReadings.length === 0) {
    return res.json({
      deviceId,
      count: 0,
      avgTemperature: null,
      avgHumidity: null,
      minTemperature: null,
      maxTemperature: null,
      minHumidity: null,
      maxHumidity: null
    });
  }

  const count = deviceReadings.length;
  const avgTemperature = deviceReadings.reduce((s, r) => s + r.temperature, 0) / count;
  const avgHumidity = deviceReadings.reduce((s, r) => s + r.humidity, 0) / count;

  const temps = deviceReadings.map(r => r.temperature);
  const hums = deviceReadings.map(r => r.humidity);

  res.json({
    deviceId,
    count,
    avgTemperature,
    avgHumidity,
    minTemperature: Math.min(...temps),
    maxTemperature: Math.max(...temps),
    minHumidity: Math.min(...hums),
    maxHumidity: Math.max(...hums)
  });
});

app.listen(PORT, () => {
  console.log(`Sensor Dashboard API running at http://localhost:${PORT}`);
});