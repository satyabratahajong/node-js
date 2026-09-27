const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3061;

app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use('/processed', express.static('processed'));

// Ensure directories exist
['uploads', 'processed'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer setup
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Upload and process endpoint
app.post('/api/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { width = 800, height, watermark, format = 'jpeg' } = req.body;
    const inputPath = req.file.path;
    const outputFilename = `${uuidv4()}.${format}`;
    const outputPath = path.join('processed', outputFilename);

    // Build sharp pipeline
    let pipeline = sharp(inputPath);

    // Resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(parseInt(width) || null, parseInt(height) || null, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Add watermark if provided
    if (watermark) {
      const watermarkBuffer = Buffer.from(
        `<svg><text x="50%" y="50%" font-size="40" fill="white" text-anchor="middle" opacity="0.5">${watermark}</text></svg>`
      );
      pipeline = pipeline.composite([{
        input: watermarkBuffer,
        gravity: 'center'
      }]);
    }

    // Convert format
    if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 80 });
    else if (format === 'png') pipeline = pipeline.png();
    else if (format === 'webp') pipeline = pipeline.webp({ quality: 80 });

    // Process and save
    await pipeline.toFile(outputPath);

    // Get metadata
    const metadata = await sharp(outputPath).metadata();

    res.json({
      success: true,
      original: {
        filename: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
      },
      processed: {
        filename: outputFilename,
        path: `/processed/${outputFilename}`,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fs.statSync(outputPath).size
      }
    });

    // Optional: Delete original after processing
    // fs.unlinkSync(inputPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing failed', message: err.message });
  }
});

// Get image metadata
app.get('/api/metadata/:filename', async (req, res) => {
  try {
    const filePath = path.join('processed', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = await sharp(filePath).metadata();
    res.json({
      filename: req.params.filename,
      ...metadata
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List processed images
app.get('/api/images', (req, res) => {
  const files = fs.readdirSync('processed')
    .filter(f => /\.(jpeg|jpg|png|webp)$/i.test(f))
    .map(filename => ({
      filename,
      url: `/processed/${filename}`
    }));
  
  res.json(files);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Image Processor running on http://localhost:${PORT}`);
});