const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const taskRoutes = require('./routes/tasks');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3013;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api', taskRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinBoard', ({ boardId }) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper to emit board updates
function emitBoardUpdate(io, boardId, type, payload) {
  io.to(`board:${boardId}`).emit('boardUpdate', { type, payload });
}

app.set('io', io);
app.set('emitBoardUpdate', emitBoardUpdate);

server.listen(PORT, () => console.log(`Task Board API running on port ${PORT}`));