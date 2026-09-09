import express from 'express';

const app = express();
const PORT = 3001; // different port from project 1

app.use(express.json());

// In-memory "database"
let tasks = [
  {
    id: 1,
    title: 'Learn Node.js',
    description: 'Build a simple REST API',
    completed: false,
    dueDate: '2026-09-20'
  },
  {
    id: 2,
    title: 'Practice SQL',
    description: 'Employee records and aggregation',
    completed: true,
    dueDate: '2026-09-15'
  }
];
let nextId = 3;

// GET /tasks - list tasks with optional filtering & sorting
app.get('/tasks', (req, res) => {
  const { completed, sort } = req.query;

  let result = [...tasks];

  // Filter by completed (true/false)
  if (completed !== undefined) {
    const completedBool = completed === 'true';
    result = result.filter(t => t.completed === completedBool);
  }

  // Sort by dueDate or title
  if (sort === 'dueDate') {
    result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  } else if (sort === 'title') {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  res.json(result);
});

// GET /tasks/:id - get one task
app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// POST /tasks - create a new task
app.post('/tasks', (req, res) => {
  const { title, description, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const newTask = {
    id: nextId++,
    title,
    description: description || '',
    completed: false,
    dueDate: dueDate || null
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT /tasks/:id - update a task
app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description, completed, dueDate } = req.body;

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (completed !== undefined) task.completed = Boolean(completed);
  if (dueDate !== undefined) task.dueDate = dueDate;

  res.json(task);
});

// DELETE /tasks/:id - delete a task
app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deleted = tasks.splice(index, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Todo API running at http://localhost:${PORT}`);
});