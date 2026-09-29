const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3082;

app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Ensure upload directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Allowed file types and max sizes
const ALLOWED_TYPES = {
  'image/jpeg': { ext: '.jpg', maxSize: 5 * 1024 * 1024 },
  'image/png': { ext: '.png', maxSize: 5 * 1024 * 1024 },
  'image/gif': { ext: '.gif', maxSize: 5 * 1024 * 1024 },
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 },
  'text/plain': { ext: '.txt', maxSize: 1 * 1024 * 1024 }
};

// File filter
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    return cb(new Error('File type not allowed'), false);
  }
  cb(null, true);
};

// Multer setup
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => {
    const typeInfo = ALLOWED_TYPES[file.mimetype];
    const ext = typeInfo ? typeInfo.ext : path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Simulated virus scan
const scanFile = async (filepath) => {
  // In production, integrate with ClamAV or VirusTotal API
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate 1% chance of "virus"
      const isInfected = Math.random() < 0.01;
      resolve({ clean: !isInfected, scanned: true });
    }, 1000);
  });
};

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filepath = req.file.path;
    const stats = fs.statSync(filepath);

    // Check file size
    const typeInfo = ALLOWED_TYPES[req.file.mimetype];
    if (typeInfo && stats.size > typeInfo.maxSize) {
      fs.unlinkSync(filepath);
      return res.status(400).json({ error: 'File too large' });
    }

    // Scan for viruses
    const scanResult = await scanFile(filepath);
    if (!scanResult.clean) {
      fs.unlinkSync(filepath);
      return res.status(400).json({ 
        error: 'File failed security scan',
        scanned: true
      });
    }

    res.json({
      success: true,
      file: {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: stats.size,
        url: `/uploads/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
        scanned: scanResult.scanned
      }
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 10MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

// Multiple file upload
app.post('/api/upload-multiple', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    for (const file of req.files) {
      const filepath = file.path;
      const stats = fs.statSync(filepath);
      const scanResult = await scanFile(filepath);

      if (!scanResult.clean) {
        fs.unlinkSync(filepath);
        results.push({
          originalName: file.originalname,
          error: 'Failed security scan'
        });
      } else {
        results.push({
          id: uuidv4(),
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: stats.size,
          url: `/uploads/${file.filename}`,
          scanned: true
        });
      }
    }

    res.json({ success: true, files: results });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

// List uploaded files
app.get('/api/files', (req, res) => {
  const files = fs.readdirSync('uploads')
    .filter(f => !f.startsWith('.'))
    .map(filename => {
      const stats = fs.statSync(path.join('uploads', filename));
      return {
        filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        uploadedAt: stats.mtime
      };
    });
  
  res.json(files);
});

// Delete file
app.delete('/api/files/:filename', (req, res) => {
  const filepath = path.join('uploads', req.params.filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlinkSync(filepath);
  res.json({ message: 'File deleted' });
});

// Get upload rules
app.get('/api/upload-rules', (req, res) => {
  res.json({
    allowedTypes: Object.keys(ALLOWED_TYPES),
    maxSize: '10MB',
    maxFiles: 5
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Secure Upload API running on http://localhost:${PORT}`);
});