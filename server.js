const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const FileMeta = require('../models/FileMeta');
const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3011';
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    const meta = new FileMeta({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url
    });
    await meta.save();

    res.status(201).json(meta);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const files = await FileMeta.find().sort({ createdAt: -1 });
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const file = await FileMeta.findByIdAndDelete(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'File deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;