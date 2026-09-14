require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Store connected devices and clients
const devices = new Map(); // deviceId -> socket
const clients = new Map(); // clientId -> { socket, subscribedDevices: Set }

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: List connected devices
app.get('/api/devices', (req, res) => {
  res.json({
    devices: Array.from(devices.keys())
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Client joins as a device
  socket.on('register-device', (data) => {
    const { deviceId } = data;
    if (!deviceId) {
      socket.emit('error', { message: 'deviceId is required' });
      return;
    }

    devices.set(deviceId, socket);
    socket.deviceId = deviceId;
    socket.isDevice = true;

    console.log(`Device registered: ${deviceId}`);
    socket.emit('registered', { deviceId });

    // Broadcast to all clients
    io.emit('device-list', {
      devices: Array.from(devices.keys())
    });
  });

  // Client joins as a console user
  socket.on('register-client', (data) => {
    const { clientId } = data;
    socket.clientId = clientId || socket.id;
    socket.isDevice = false;

    clients.set(socket.clientId, {
      socket,
      subscribedDevices: new Set()
    });

    console.log(`Client registered: ${socket.clientId}`);
    socket.emit('registered', { clientId: socket.clientId });

    // Send current device list
    socket.emit('device-list', {
      devices: Array.from(devices.keys())
    });
  });

  // Subscribe to device logs
  socket.on('subscribe-device', (data) => {
    const { deviceId } = data;
    if (!clients.has(socket.clientId)) return;

    const client = clients.get(socket.clientId);
    client.subscribedDevices.add(deviceId);
    socket.join(`device:${deviceId}`);

    console.log(`Client ${socket.clientId} subscribed to ${deviceId}`);
    socket.emit('subscribed', { deviceId });
  });

  // Unsubscribe from device logs
  socket.on('unsubscribe-device', (data) => {
    const { deviceId } = data;
    if (!clients.has(socket.clientId)) return;

    const client = clients.get(socket.clientId);
    client.subscribedDevices.delete(deviceId);
    socket.leave(`device:${deviceId}`);

    console.log(`Client ${socket.clientId} unsubscribed from ${deviceId}`);
    socket.emit('unsubscribed', { deviceId });
  });

  // Send command to device
  socket.on('send-command', (data) => {
    const { deviceId, command } = data;
    if (!deviceId || !command) {
      socket.emit('error', { message: 'deviceId and command are required' });
      return;
    }

    const deviceSocket = devices.get(deviceId);
    if (!deviceSocket) {
      socket.emit('error', { message: `Device ${deviceId} not found` });
      return;
    }

    console.log(`Command to ${deviceId}: ${command}`);
    deviceSocket.emit('command', {
      command,
      from: socket.clientId,
      timestamp: new Date().toISOString()
    });
  });

  // Device sends log/data
  socket.on('device-log', (data) => {
    const { deviceId, log, level = 'info' } = data;
    if (!deviceId) return;

    const logData = {
      deviceId,
      log,
      level,
      timestamp: new Date().toISOString()
    };

    console.log(`Log from ${deviceId}:`, log);

    // Broadcast to all clients subscribed to this device
    io.to(`device:${deviceId}`).emit('device-log', logData);

    // Also emit to all clients for demo purposes
    io.emit('global-log', logData);
  });

  // Device sends sensor data
  socket.on('sensor-data', (data) => {
    const { deviceId, sensorType, value, unit } = data;
    if (!deviceId || sensorType === undefined || value === undefined) return;

    const sensorData = {
      deviceId,
      sensorType,
      value,
      unit,
      timestamp: new Date().toISOString()
    };

    io.to(`device:${deviceId}`).emit('sensor-data', sensorData);
    io.emit('global-sensor-data', sensorData);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.isDevice && socket.deviceId) {
      devices.delete(socket.deviceId);
      console.log(`Device disconnected: ${socket.deviceId}`);
      io.emit('device-list', {
        devices: Array.from(devices.keys())
      });
    } else if (socket.clientId) {
      clients.delete(socket.clientId);
      console.log(`Client disconnected: ${socket.clientId}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});