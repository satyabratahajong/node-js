const express = require("express");
const crypto = require("node:crypto");
const { fileURLToPath } = require("node:url");

const app = express();
const PORT = 3005;

app.use(express.json());

const jobs = new Map();
const queue = [];

function createJob(type, payload) {
  const job = {
    id: crypto.randomUUID(),
    type,
    payload,
    status: "queued",
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  jobs.set(job.id, job);
  queue.push(job);

  processQueue();

  return job;
}

async function processQueue() {
  const job = queue.shift();

  if (!job || job.status !== "queued") {
    return;
  }

  job.status = "processing";

  try {
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    if (job.type === "uppercase") {
      job.result = String(job.payload.text).toUpperCase();
    } else if (job.type === "reverse") {
      job.result = String(job.payload.text).split("").reverse().join("");
    } else {
      throw new Error("Unknown job type");
    }

    job.status = "completed";
    job.completedAt = new Date().toISOString();
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
  }

  if (queue.length > 0) {
    processQueue();
  }
}

app.post("/jobs", (req, res) => {
  const { type, text } = req.body;

  if (!["uppercase", "reverse"].includes(type)) {
    return res.status(400).json({
      error: "type must be uppercase or reverse"
    });
  }

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      error: "text is required"
    });
  }

  const job = createJob(type, { text });

  res.status(202).json(job);
});

app.get("/jobs", (req, res) => {
  res.json([...jobs.values()]);
});

app.get("/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found"
    });
  }

  res.json(job);
});

app.listen(PORT, () => {
  console.log(`Job queue running at http://localhost:${PORT}`);
}); 