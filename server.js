const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3032;
const DATA_FILE = process.env.DATA_FILE || './data/habits.json';

// Ensure data directory
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Load / initialize data
let data = { habits: [], logs: [] };
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    // ignore corrupt file, start fresh
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create habit
app.post('/habits', (req, res) => {
  try {
    const { name, frequency } = req.body; // frequency: 'daily', 'weekly'
    if (!name) return res.status(400).json({ error: 'name required' });

    const habit = {
      id: uuidv4(),
      name,
      frequency: frequency || 'daily',
      createdAt: new Date().toISOString()
    };
    data.habits.push(habit);
    saveData();
    res.status(201).json(habit);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// List habits
app.get('/habits', (req, res) => {
  res.json(data.habits);
});

// Log a habit completion
app.post('/logs', (req, res) => {
  try {
    const { habitId, date } = req.body; // date: 'YYYY-MM-DD'
    if (!habitId || !date) {
      return res.status(400).json({ error: 'habitId and date required' });
    }

    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const existing = data.logs.find(l => l.habitId === habitId && l.date === date);
    if (existing) {
      return res.status(409).json({ error: 'Log already exists for this date' });
    }

    const log = { id: uuidv4(), habitId, date, createdAt: new Date().toISOString() };
    data.logs.push(log);
    saveData();
    res.status(201).json(log);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get logs for a habit
app.get('/habits/:habitId/logs', (req, res) => {
  const { habitId } = req.params;
  const logs = data.logs.filter(l => l.habitId === habitId).sort((a, b) => a.date.localeCompare(b.date));
  res.json(logs);
});

// Get simple stats for a habit (completion count & rate over last N days)
app.get('/habits/:habitId/stats', (req, res) => {
  try {
    const { habitId } = req.params;
    const { lastDays = 30 } = req.query;
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - parseInt(lastDays) + 1);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    const logs = data.logs.filter(
      l => l.habitId === habitId && l.date >= startStr && l.date <= endStr
    );

    const completionCount = logs.length;
    const rate = completionCount / parseInt(lastDays);

    res.json({
      habitId,
      lastDays: parseInt(lastDays),
      completionCount,
      rate: Math.round(rate * 100) / 100
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Habit Tracker API running on port ${PORT}`);
});