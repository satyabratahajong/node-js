import express from 'express';

const app = express();
const PORT = 3004;

app.use(express.json());

// In-memory "DB"
let expenses = [
  { id: 1, description: 'Groceries', amount: 1200, category: 'food', date: '2026-09-01' },
  { id: 2, description: 'Bus pass', amount: 300, category: 'transport', date: '2026-09-03' }
];
let nextId = 3;

// GET /expenses
app.get('/expenses', (req, res) => {
  const { category, from, to } = req.query;

  let result = [...expenses];

  if (category) {
    result = result.filter(e => e.category === category);
  }
  if (from) {
    result = result.filter(e => e.date >= from);
  }
  if (to) {
    result = result.filter(e => e.date <= to);
  }

  res.json(result);
});

// GET /expenses/summary
app.get('/expenses/summary', (req, res) => {
  const { from, to, groupBy } = req.query;

  let result = [...expenses];

  if (from) {
    result = result.filter(e => e.date >= from);
  }
  if (to) {
    result = result.filter(e => e.date <= to);
  }

  const total = result.reduce((sum, e) => sum + e.amount, 0);

  let grouped = null;
  if (groupBy === 'category') {
    const map = new Map();
    for (const e of result) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    }
    grouped = Object.fromEntries(map);
  }

  res.json({ total, from: from || null, to: to || null, grouped });
});

// GET /expenses/:id
app.get('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const expense = expenses.find(e => e.id === id);

  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  res.json(expense);
});

// POST /expenses
app.post('/expenses', (req, res) => {
  const { description, amount, category, date } = req.body;

  if (!description || amount == null || !category || !date) {
    return res.status(400).json({ error: 'description, amount, category, and date are required' });
  }

  const expense = {
    id: nextId++,
    description,
    amount: Number(amount),
    category,
    date
  };

  expenses.push(expense);
  res.status(201).json(expense);
});

// PUT /expenses/:id
app.put('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const { description, amount, category, date } = req.body;

  const expense = expenses.find(e => e.id === id);
  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  if (description !== undefined) expense.description = description;
  if (amount !== undefined) expense.amount = Number(amount);
  if (category !== undefined) expense.category = category;
  if (date !== undefined) expense.date = date;

  res.json(expense);
});

// DELETE /expenses/:id
app.delete('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = expenses.findIndex(e => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const deleted = expenses.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Expense Tracker API running at http://localhost:${PORT}`);
});