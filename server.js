const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = 'your_super_secret_key'; // Use environment variables in production

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/taskmanager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas & Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
});
const Task = mongoose.model('Task', TaskSchema);

// Auth Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.userId;
    next();
  });
};

// Routes: Register & Login
app.post('/api/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists or invalid data' });
  }
});

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Protected Route: Create Task
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const task = new Task({ ...req.body, owner: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Protected Route: Get User's Tasks
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Task API running on http://localhost:3000'));
