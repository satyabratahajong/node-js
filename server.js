const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3091;

// In-memory stores
const clients = new Map(); // Map<clientId, { ws, subscriptions }>
const topics = new Map();  // Map<topic, Set<clientId>>

app.use(express.json());

// WebSocket connection handler
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, subscriptions: new Set() });
  
  console.log(`Client connected: ${clientId}`);
  
  // Send client their ID
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Connected to notification system'
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(clientId, message);
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    removeClient(clientId);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${clientId}:`, err.message);
    removeClient(clientId);
  });
});

function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      handleSubscribe(clientId, message.topic);
      break;
    case 'unsubscribe':
      handleUnsubscribe(clientId, message.topic);
      break;
    case 'publish':
      handlePublish(clientId, message.topic, message.data);
      break;
    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

function handleSubscribe(clientId, topic) {
  const client = clients.get(clientId);
  if (!client || !topic) return;

  client.subscriptions.add(topic);
  
  if (!topics.has(topic)) {
    topics.set(topic, new Set());
  }
  topics.get(topic).add(clientId);

  client.ws.send(JSON.stringify({
    type: 'subscribed',
    topic,
    message: `Subscribed to ${topic}`
  }));

  console.log(`Client ${clientId} subscribed to ${topic}`);
}

function handleUnsubscribe(clientId, topic) {
  const client = clients.get(clientId);
  if (!client || !topic) return;

  client.subscriptions.delete(topic);
  
  if (topics.has(topic)) {
    topics.get(topic).delete(clientId);
    if (topics.get(topic).size === 0) {
      topics.delete(topic);
    }
  }

  client.ws.send(JSON.stringify({
    type: 'unsubscribed',
    topic,
    message: `Unsubscribed from ${topic}`
  }));

  console.log(`Client ${clientId} unsubscribed from ${topic}`);
}

function handlePublish(clientId, topic, data) {
  if (!topic) return;

  const subscribers = topics.get(topic);
  if (!subscribers || subscribers.size === 0) {
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'publish_result',
        topic,
        subscriberCount: 0,
        message: 'No subscribers for this topic'
      }));
    }
    return;
  }

  const notification = {
    type: 'notification',
    topic,
    data,
    timestamp: new Date().toISOString(),
    publisherId: clientId
  };

  let sentCount = 0;
  for (const subscriberId of subscribers) {
    const subscriber = clients.get(subscriberId);
    if (subscriber && subscriber.ws.readyState === WebSocket.OPEN) {
      subscriber.ws.send(JSON.stringify(notification));
      sentCount++;
    }
  }

  // Confirm to publisher
  const publisher = clients.get(clientId);
  if (publisher) {
    publisher.ws.send(JSON.stringify({
      type: 'publish_result',
      topic,
      subscriberCount: sentCount,
      message: `Notification sent to ${sentCount} subscribers`
    }));
  }

  console.log(`Published to ${topic}: ${sentCount} subscribers`);
}

function removeClient(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  // Remove from all topics
  for (const topic of client.subscriptions) {
    if (topics.has(topic)) {
      topics.get(topic).delete(clientId);
      if (topics.get(topic).size === 0) {
        topics.delete(topic);
      }
    }
  }

  clients.delete(clientId);
}

// REST API for publishing notifications
app.post('/api/notify/:topic', (req, res) => {
  const { topic } = req.params;
  const { data } = req.body;

  const subscribers = topics.get(topic);
  if (!subscribers || subscribers.size === 0) {
    return res.json({
      success: true,
      subscriberCount: 0,
      message: 'No subscribers for this topic'
    });
  }

  const notification = {
    type: 'notification',
    topic,
    data,
    timestamp: new Date().toISOString(),
    publisherId: 'rest-api'
  };

  let sentCount = 0;
  for (const subscriberId of subscribers) {
    const subscriber = clients.get(subscriberId);
    if (subscriber && subscriber.ws.readyState === WebSocket.OPEN) {
      subscriber.ws.send(JSON.stringify(notification));
      sentCount++;
    }
  }

  res.json({
    success: true,
    subscriberCount: sentCount,
    message: `Notification sent to ${sentCount} subscribers`
  });
});

// Get stats
app.get('/api/stats', (req, res) => {
  res.json({
    connectedClients: clients.size,
    activeTopics: topics.size,
    topics: Array.from(topics.entries()).map(([topic, subs]) => ({
      topic,
      subscriberCount: subs.size
    }))
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`Notification System running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
}); 