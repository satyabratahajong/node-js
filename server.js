const express = require("express");
const app = express();

app.use(express.json());

let tasks = [
  { id: 1, title: "Learn Node.js", completed: false },
  { id: 2, title: "Build an ESP32 dashboard", completed: false },
];

// Get all tasks
app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

// Create task
app.post("/api/tasks", (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const task = {
    id: tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title,
    completed: false,
  };

  tasks.push(task);
  res.status(201).json(task);
});

// Update task
app.put("/api/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.title = req.body.title ?? task.title;
  task.completed = req.body.completed ?? task.completed;

  res.json(task);
});

// Delete task
app.delete("/api/tasks/:id", (req, res) => {
  const exists = tasks.some(t => t.id === Number(req.params.id));

  if (!exists) {
    return res.status(404).json({ error: "Task not found" });
  }

  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Task API running on http://localhost:${PORT}`));