const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
// Configure multer to store files in memory as buffers
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload an image file (JPG/PNG)'));
    }
    cb(null, true);
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract image metadata using sharp
    const metadata = await sharp(req.file.buffer).metadata();

    res.json({
      message: 'File uploaded and processed successfully!',
      filename: req.file.originalname,
      sizeInBytes: req.file.size,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('File service running on http://localhost:3000'));
