import express from 'express';

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory "database"
let items = [
  { id: 1, name: 'Item One', description: 'First item' },
  { id: 2, name: 'Item Two', description: 'Second item' }
];
let nextId = 3;

// GET /items - list all items
app.get('/items', (req, res) => {
  res.json(items);
});

// GET /items/:id - get one item by id
app.get('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.json(item);
});

// POST /items - create a new item
app.post('/items', (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'name and description are required' });
  }

  const newItem = { id: nextId++, name, description };
  items.push(newItem);

  res.status(201).json(newItem);
});

// PUT /items/:id - update an existing item
app.put('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;

  const item = items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (name) item.name = name;
  if (description) item.description = description;

  res.json(item);
});

// DELETE /items/:id - delete an item
app.delete('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const deleted = items.splice(index, 1)[0];
  res.json(deleted);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});