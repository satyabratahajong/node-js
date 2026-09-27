const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3062;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory metrics store
const metrics = {
  pageViews: 0,
  apiCalls: 0,
  activeUsers: 0,
  events: [],
  topPages: {},
  hourlyStats: {}
};

// Track metrics
const trackEvent = (type, data) => {
  const event = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  metrics.events.push(event);
  if (metrics.events.length > 1000) metrics.events.shift(); // Keep last 1000

  // Update counters
  if (type === 'pageview') {
    metrics.pageViews++;
    const page = data.path || '/';
    metrics.topPages[page] = (metrics.topPages[page] || 0) + 1;
  } else if (type === 'apiCall') {
    metrics.apiCalls++;
  }

  // Update hourly stats
  const hour = new Date().getHours();
  metrics.hourlyStats[hour] = (metrics.hourlyStats[hour] || 0) + 1;

  // Broadcast to all connected clients
  io.emit('metricUpdate', {
    type,
    data: event,
    summary: {
      pageViews: metrics.pageViews,
      apiCalls: metrics.apiCalls,
      activeUsers: metrics.activeUsers
    }
  });
};

// WebSocket connections
io.on('connection', (socket) => {
  metrics.activeUsers++;
  io.emit('activeUsers', metrics.activeUsers);

  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('initialData', {
    metrics,
    activeUsers: metrics.activeUsers
  });

  socket.on('disconnect', () => {
    metrics.activeUsers--;
    io.emit('activeUsers', metrics.activeUsers);
    console.log('Client disconnected:', socket.id);
  });

  // Receive custom events from clients
  socket.on('trackEvent', (payload) => {
    trackEvent(payload.type, payload.data);
  });
});

// API endpoints to track events
app.post('/api/track', (req, res) => {
  const { type, data } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  trackEvent(type, data || {});
  res.json({ success: true });
});

// Track page views via query param
app.get('/api/track-pageview', (req, res) => {
  trackEvent('pageview', {
    path: req.query.path || '/',
    referrer: req.query.referrer
  });
  res.json({ success: true });
});

// Get current metrics
app.get('/api/metrics', (req, res) => {
  res.json({
    pageViews: metrics.pageViews,
    apiCalls: metrics.apiCalls,
    activeUsers: metrics.activeUsers,
    topPages: Object.entries(metrics.topPages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    hourlyStats: metrics.hourlyStats,
    recentEvents: metrics.events.slice(-20)
  });
});

// Reset metrics (admin)
app.post('/api/reset', (req, res) => {
  metrics.pageViews = 0;
  metrics.apiCalls = 0;
  metrics.events = [];
  metrics.topPages = {};
  metrics.hourlyStats = {};
  io.emit('metricsReset');
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeUsers: metrics.activeUsers,
    totalPageViews: metrics.pageViews
  });
});

server.listen(PORT, () => {
  console.log(`Analytics Dashboard running on http://localhost:${PORT}`);
});