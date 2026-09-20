const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();
const PORT = 3000;

const dataDirectory = path.join(__dirname, "data");
const dataFile = path.join(dataDirectory, "tasks.json");

app.use(express.json());

async function ensureDatabase() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]");
  }
}

async function readTasks() {
  const data = await fs.readFile(dataFile, "utf-8");
  return JSON.parse(data);
}

async function saveTasks(tasks) {
  await fs.writeFile(dataFile, JSON.stringify(tasks, null, 2));
}

app.get("/", (req, res) => {
  res.json({
    message: "Task Manager API",
    endpoints: [
      "GET /tasks",
      "POST /tasks",
      "PUT /tasks/:id",
      "DELETE /tasks/:id"
    ]
  });
});

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Could not read tasks" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { title, description = "" } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        error: "Task title is required"
      });
    }

    const tasks = await readTasks();

    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    await saveTasks(tasks);

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: "Could not create task" });
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === req.params.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    const currentTask = tasks[taskIndex];

    tasks[taskIndex] = {
      ...currentTask,
      title: req.body.title ?? currentTask.title,
      description: req.body.description ?? currentTask.description,
      completed: req.body.completed ?? currentTask.completed,
      updatedAt: new Date().toISOString()
    };

    await saveTasks(tasks);

    res.json(tasks[taskIndex]);
  } catch (error) {
    res.status(500).json({ error: "Could not update task" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const tasks = await readTasks();
    const filteredTasks = tasks.filter((task) => task.id !== req.params.id);

    if (filteredTasks.length === tasks.length) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    await saveTasks(filteredTasks);

    res.json({
      message: "Task deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: "Could not delete task" });
  }
});

ensureDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Task API running at http://localhost:${PORT}`);
  });
});