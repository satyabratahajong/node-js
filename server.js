const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3050;

app.use(cors());

// Serve HTML player
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Stream video endpoint
app.get('/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse range header (e.g., "bytes=32324-")
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    // Stream the file chunk
    const stream = fs.createReadStream(filePath, { start, end });
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });

    stream.pipe(res);
  } else {
    // No range request - send full file (not recommended for large videos)
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    stream.pipe(res);
  }
});

app.listen(PORT, () => {
  console.log(`Video Streamer running on http://localhost:${PORT}`);
});