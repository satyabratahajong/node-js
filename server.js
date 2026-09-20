const express = require("express");

const app = express();
const PORT = 3001;

app.use(express.json());

const readings = [];

app.get("/", (req, res) => {
  res.json({
    message: "IoT Sensor Data API",
    endpoints: [
      "POST /readings",
      "GET /readings",
      "GET /readings/summary"
    ]
  });
});

app.post("/readings", (req, res) => {
  const { deviceId, temperature, humidity } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      error: "deviceId is required"
    });
  }

  if (
    typeof temperature !== "number" ||
    typeof humidity !== "number"
  ) {
    return res.status(400).json({
      error: "temperature and humidity must be numbers"
    });
  }

  const reading = {
    id: readings.length + 1,
    deviceId,
    temperature,
    humidity,
    receivedAt: new Date().toISOString()
  };

  readings.push(reading);

  res.status(201).json(reading);
});

app.get("/readings", (req, res) => {
  const { deviceId } = req.query;

  if (deviceId) {
    return res.json(
      readings.filter((reading) => reading.deviceId === deviceId)
    );
  }

  res.json(readings);
});

app.get("/readings/summary", (req, res) => {
  if (readings.length === 0) {
    return res.json({
      count: 0,
      message: "No sensor readings available"
    });
  }

  const temperatures = readings.map((reading) => reading.temperature);
  const humidities = readings.map((reading) => reading.humidity);

  const average = (values) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  res.json({
    count: readings.length,
    temperature: {
      average: Number(average(temperatures).toFixed(2)),
      minimum: Math.min(...temperatures),
      maximum: Math.max(...temperatures)
    },
    humidity: {
      average: Number(average(humidities).toFixed(2)),
      minimum: Math.min(...humidities),
      maximum: Math.max(...humidities)
    }
  });
});

app.listen(PORT, () => {
  console.log(`IoT API running at http://localhost:${PORT}`);
});