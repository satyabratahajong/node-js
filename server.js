const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3021;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', ({ roomId }) => {
    socket.join(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('userJoined', { roomId, userId: socket.id });
  });

  socket.on('sendMessage', async ({ roomId, sender, text }) => {
    const Message = mongoose.model('Message');
    const msg = new Message({ roomId, sender, text });
    await msg.save();
    io.to(`room:${roomId}`).emit('newMessage', {
      roomId,
      sender,
      text,
      timestamp: msg.createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});