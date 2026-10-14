const express = require('express');
const app = express();
app.use(express.json());

let clients = [];

// SSE endpoint clients connect to
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

// Broadcast endpoint to trigger notifications to all connected clients
app.post('/api/notify', (req, res) => {
  const { message } = req.body;
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ message, timestamp: new Date() })}\n\n`);
  });
  res.json({ status: 'Broadcasted to active streams', activeClients: clients.length });
});

app.listen(3000, () => console.log('SSE Server running on http://localhost:3000'));
