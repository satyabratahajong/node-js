import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3003;
const JWT_SECRET = 'change-me-to-a-random-string';

app.use(express.json());

// In-memory "DB"
const users = []; // { id, email, passwordHash }
const notes = []; // { id, userId, title, content }
let nextUserId = 1;
let nextNoteId = 1;

// Middleware: verify JWT and attach user to request
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextUserId++, email, passwordHash };
  users.push(user);

  res.status(201).json({ id: user.id, email: user.email });
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, userId: user.id, email: user.email });
});

// GET /notes (auth required)
app.get('/notes', authMiddleware, (req, res) => {
  const userNotes = notes.filter(n => n.userId === req.userId);
  res.json(userNotes);
});

// GET /notes/:id (auth required)
app.get('/notes/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find(n => n.id === id && n.userId === req.userId);

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  res.json(note);
});

// POST /notes (auth required)
app.post('/notes', authMiddleware, (req, res) => {
  const { title, content } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const note = {
    id: nextNoteId++,
    userId: req.userId,
    title,
    content: content || ''
  };

  notes.push(note);
  res.status(201).json(note);
});

// PUT /notes/:id (auth required)
app.put('/notes/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body;

  const note = notes.find(n => n.id === id && n.userId === req.userId);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;

  res.json(note);
});

// DELETE /notes/:id (auth required)
app.delete('/notes/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const index = notes.findIndex(n => n.id === id && n.userId === req.userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const deleted = notes.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Auth Notes API running at http://localhost:${PORT}`);
});