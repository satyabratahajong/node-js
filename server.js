const net = require('net');

// In-memory store
const store = new Map();

const server = net.createServer((socket) => {
  console.log('Client connected:', socket.remoteAddress);

  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString();

    // Process commands line by line
    const lines = buffer.split('\r\n');
    buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(' ');
      const command = parts[0].toUpperCase();

      if (command === 'SET' && parts.length >= 3) {
        const key = parts[1];
        const value = parts.slice(2).join(' ');
        store.set(key, value);
        socket.write('+OK\r\n');
      } else if (command === 'GET' && parts.length >= 2) {
        const key = parts[1];
        const value = store.get(key);
        if (value !== undefined) {
          socket.write(`$${value.length}\r\n${value}\r\n`);
        } else {
          socket.write('$-1\r\n'); // Null bulk reply
        }
      } else if (command === 'PING') {
        socket.write('+PONG\r\n');
      } else if (command === 'QUIT') {
        socket.write('+OK\r\n');
        socket.end();
      } else {
        socket.write('-ERR unknown command\r\n');
      }
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

const PORT = 6379;
server.listen(PORT, () => {
  console.log(`Redis Clone listening on port ${PORT}`);
});