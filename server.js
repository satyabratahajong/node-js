const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.static('public')); // Serve static HTML client

// In-memory document store (replace with DB/Redis for production)
const documents = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a document room
  socket.on('joinDocument', ({ docId }) => {
    socket.join(`doc:${docId}`);
    
    // Initialize doc if new
    if (!documents[docId]) {
      documents[docId] = { content: '', users: [] };
    }
    
    documents[docId].users.push(socket.id);
    
    // Send current content to the new user
    socket.emit('documentState', { content: documents[docId].content });
    
    // Notify others
    socket.to(`doc:${docId}`).emit('userJoined', { userId: socket.id });
  });

  // Handle text changes
  socket.on('textChange', ({ docId, content }) => {
    if (!documents[docId]) return;
    
    documents[docId].content = content;
    
    // Broadcast to everyone else in the room
    socket.to(`doc:${docId}`).emit('textUpdate', { 
      content, 
      userId: socket.id 
    });
  });

  socket.on('disconnect', () => {
    // Remove user from all docs
    Object.keys(documents).forEach(docId => {
      const doc = documents[docId];
      const userIndex = doc.users.indexOf(socket.id);
      if (userIndex > -1) {
        doc.users.splice(userIndex, 1);
        io.to(`doc:${docId}`).emit('userLeft', { userId: socket.id });
        
        // Cleanup empty docs
        if (doc.users.length === 0) {
          delete documents[docId];
        }
      }
    });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3040;
server.listen(PORT, () => {
  console.log(`Collab Editor running on http://localhost:${PORT}`);
});