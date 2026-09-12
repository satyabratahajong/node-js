import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3022;
const JWT_SECRET = 'change-me-to-a-strong-random-string';
const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';

app.use(express.json());

// In-memory "DB"
const users = []; // { id, email, passwordHash, refreshToken? }
let nextId = 1;

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
  const user = { id: nextId++, email, passwordHash };
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

  const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: ACCESS_EXP });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXP });

  user.refreshToken = refreshToken;

  res.json({
    accessToken,
    refreshToken,
    userId: user.id,
    email: user.email
  });
});

// POST /auth/refresh
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = users.find(u => u.id === payload.userId && u.refreshToken === refreshToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXP });

    user.refreshToken = newRefreshToken;

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /auth/me (requires access token)
app.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: user.id, email: user.email });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/logout
app.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.refreshToken = null;
    res.json({ message: 'Logged out' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service running at http://localhost:${PORT}`);
});