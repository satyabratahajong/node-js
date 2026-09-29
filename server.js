const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3080;

app.use(cors());
app.use(express.static('public'));

// In-memory store
const rooms = new Map();
const users = new Map();

// Initialize default room
rooms.set('general', { id: 'general', name: 'General', messages: [], users: new Set() });

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with username
  socket.on('join', ({ username, roomId = 'general' }) => {
    const user = {
      id: socket.id,
      username,
      roomId,
      joinedAt: new Date().toISOString()
    };

    users.set(socket.id, user);

    // Create room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { id: roomId, name: roomId, messages: [], users: new Set() });
    }

    const room = rooms.get(roomId);
    room.users.add(socket.id);
    socket.join(roomId);

    // Send room history to user
    socket.emit('roomHistory', { messages: room.messages.slice(-50) });

    // Notify room members
    socket.to(roomId).emit('userJoined', {
      roomId,
      user: { id: socket.id, username }
    });

    // Send updated user list to room
    io.to(roomId).emit('roomUsers', {
      roomId,
      users: Array.from(room.users).map(uid => users.get(uid)).filter(Boolean)
    });

    socket.emit('joined', { roomId, user });
  });

  // Handle chat messages
  socket.on('message', ({ roomId, content }) => {
    const user = users.get(socket.id);
    if (!user || user.roomId !== roomId) return;

    const message = {
      id: uuidv4(),
      roomId,
      userId: socket.id,
      username: user.username,
      content,
      timestamp: new Date().toISOString()
    };

    const room = rooms.get(roomId);
    if (room) {
      room.messages.push(message);
      // Keep last 100 messages
      if (room.messages.length > 100) room.messages.shift();
    }

    io.to(roomId).emit('message', message);
  });

  // Typing indicator
  socket.on('typing', ({ roomId, isTyping }) => {
    const user = users.get(socket.id);
    if (!user || user.roomId !== roomId) return;

    socket.to(roomId).emit('userTyping', {
      roomId,
      userId: socket.id,
      username: user.username,
      isTyping
    });
  });

  // Switch room
  socket.on('switchRoom', ({ roomId }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const oldRoomId = user.roomId;
    const oldRoom = rooms.get(oldRoomId);
    
    if (oldRoom) {
      oldRoom.users.delete(socket.id);
      socket.leave(oldRoomId);
      
      io.to(oldRoomId).emit('userLeft', {
        roomId: oldRoomId,
        user: { id: socket.id, username: user.username }
      });

      io.to(oldRoomId).emit('roomUsers', {
        roomId: oldRoomId,
        users: Array.from(oldRoom.users).map(uid => users.get(uid)).filter(Boolean)
      });
    }

    // Join new room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { id: roomId, name: roomId, messages: [], users: new Set() });
    }

    const newRoom = rooms.get(roomId);
    newRoom.users.add(socket.id);
    user.roomId = roomId;
    socket.join(roomId);

    socket.emit('roomHistory', { messages: newRoom.messages.slice(-50) });
    
    io.to(roomId).emit('userJoined', {
      roomId,
      user: { id: socket.id, username: user.username }
    });

    io.to(roomId).emit('roomUsers', {
      roomId,
      users: Array.from(newRoom.users).map(uid => users.get(uid)).filter(Boolean)
    });

    socket.emit('switchedRoom', { roomId });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        room.users.delete(socket.id);
        
        io.to(user.roomId).emit('userLeft', {
          roomId: user.roomId,
          user: { id: socket.id, username: user.username }
        });

        io.to(user.roomId).emit('roomUsers', {
          roomId: user.roomId,
          users: Array.from(room.users).map(uid => users.get(uid)).filter(Boolean)
        });
      }
      
      users.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

// API: Get all rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    messageCount: room.messages.length
  }));
  res.json(roomList);
});

// API: Get room messages
app.get('/api/rooms/:roomId/messages', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.messages.slice(-100));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeUsers: users.size,
    totalRooms: rooms.size
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});