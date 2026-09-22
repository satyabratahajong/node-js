const express = require('express');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3031;
const NOTES_DIR = process.env.NOTES_DIR || './notes';

if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// List all notes (filenames without .md)
app.get('/notes', (req, res) => {
  try {
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
    const notes = files.map(f => ({ slug: f.replace(/\.md$/, '') }));
    res.json(notes);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a note by slug
app.get('/notes/:slug', (req, res) => {
  try {
    const slug = slugify(req.params.slug, { lower: true, strict: true });
    const filePath = path.join(NOTES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Note not found' });

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ slug, content });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a note
app.post('/notes', (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content required' });
    }

    const slug = slugify(title, { lower: true, strict: true });
    const filePath = path.join(NOTES_DIR, `${slug}.md`);

    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'Note with this title already exists' });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    res.status(201).json({ slug, title, content });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a note
app.put('/notes/:slug', (req, res) => {
  try {
    const slug = slugify(req.params.slug, { lower: true, strict: true });
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'content required' });
    }

    const filePath = path.join(NOTES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Note not found' });

    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ slug, content });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a note
app.delete('/notes/:slug', (req, res) => {
  try {
    const slug = slugify(req.params.slug, { lower: true, strict: true });
    const filePath = path.join(NOTES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Note not found' });

    fs.unlinkSync(filePath);
    res.json({ message: 'Note deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Markdown Notes API running on port ${PORT}`);
});