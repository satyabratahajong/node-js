import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3021;

// Store files in ./uploads
const uploadDir = join(__dirname, 'uploads');
import { mkdirSync, existsSync } from 'fs';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.use(express.json());

// In-memory metadata
const files = []; // { id, originalName, filename, mimetype, size, uploadedAt }
let nextId = 1;

// POST /files (upload)
app.post('/files', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const meta = {
    id: nextId++,
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString()
  };

  files.push(meta);
  res.status(201).json(meta);
});

// GET /files (list metadata)
app.get('/files', (req, res) => {
  res.json(files);
});

// GET /files/:id (download)
app.get('/files/:id', (req, res) => {
  const id = Number(req.params.id);
  const meta = files.find(f => f.id === id);

  if (!meta) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = join(uploadDir, meta.filename);
  res.download(filePath, meta.originalName);
});

// DELETE /files/:id
app.delete('/files/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = files.findIndex(f => f.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  const meta = files[index];

  // Delete physical file
  import { unlinkSync } from 'fs';
  import { join } from 'path';
  const filePath = join(uploadDir, meta.filename);
  try {
    unlinkSync(filePath);
  } catch {
    // ignore if missing
  }

  files.splice(index, 1);
  res.json(meta);
});

app.listen(PORT, () => {
  console.log(`File Upload API running at http://localhost:${PORT}`);
});