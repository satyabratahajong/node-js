const express = require('express');
const app = express();
app.use(express.json());

const monitoredServices = [
  { name: 'Auth Service', url: 'https://httpbin.org/status/200' },
  { name: 'Payment API', url: 'https://httpbin.org/status/500' }
];

const serviceStatuses = new Map();

// Check services status every 30 seconds
async function checkUptime() {
  for (const service of monitoredServices) {
    const startTime = Date.now();
    try {
      const response = await fetch(service.url);
      const latency = Date.now() - startTime;
      serviceStatuses.set(service.name, {
        status: response.ok ? 'UP' : 'DOWN',
        statusCode: response.status,
        latencyMs: latency,
        lastChecked: new Date().toISOString()
      });
    } catch (err) {
      serviceStatuses.set(service.name, {
        status: 'DOWN',
        error: err.message,
        lastChecked: new Date().toISOString()
      });
    }
  }
}

setInterval(checkUptime, 30000);
checkUptime(); // Initial check on startup

app.get('/api/health-dashboard', (req, res) => {
  const report = {};
  for (const [key, value] of serviceStatuses.entries()) {
    report[key] = value;
  }
  res.json({ systemTime: new Date(), services: report });
});

app.listen(3000, () => console.log('Uptime Monitor running on http://localhost:3000'));
