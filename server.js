const express = require("express");
const crypto = require("node:crypto");

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const jobs = new Map();
const queue = [];

let isProcessing = false;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createJob(type, payload) {
  const job = {
    id: crypto.randomUUID(),
    type,
    payload,
    status: "queued",
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  };

  jobs.set(job.id, job);
  queue.push(job);

  processNextJob();

  return job;
}

async function processNextJob() {
  if (isProcessing || queue.length === 0) {
    return;
  }

  isProcessing = true;

  const job = queue.shift();

  job.status = "processing";
  job.startedAt = new Date().toISOString();

  try {
    await processJob(job);

    job.status = "completed";
    job.completedAt = new Date().toISOString();
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
    job.completedAt = new Date().toISOString();
  } finally {
    isProcessing = false;

    setImmediate(() => {
      processNextJob();
    });
  }
}

async function processJob(job) {
  await sleep(2000);

  const text = job.payload.text;

  if (typeof text !== "string") {
    throw new Error("Job text must be a string");
  }

  if (job.type === "uppercase") {
    job.result = text.toUpperCase();
    return;
  }

  if (job.type === "reverse") {
    job.result = text.split("").reverse().join("");
    return;
  }

  if (job.type === "wordCount") {
    const words = text.trim() === ""
      ? []
      : text.trim().split(/\s+/);

    job.result = {
      text,
      wordCount: words.length,
      characterCount: text.length
    };

    return;
  }

  throw new Error(`Unsupported job type: ${job.type}`);
}

app.get("/", (req, res) => {
  res.json({
    name: "Background Job Queue API",
    endpoints: {
      createJob: "POST /jobs",
      listJobs: "GET /jobs",
      getJob: "GET /jobs/:id",
      deleteJob: "DELETE /jobs/:id",
      queueStatus: "GET /queue/status"
    }
  });
});

app.post("/jobs", (req, res) => {
  const { type, text } = req.body;

  const supportedTypes = [
    "uppercase",
    "reverse",
    "wordCount"
  ];

  if (!supportedTypes.includes(type)) {
    return res.status(400).json({
      error: "Invalid job type",
      supportedTypes
    });
  }

  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({
      error: "text must be a non-empty string"
    });
  }

  if (text.length > 5000) {
    return res.status(400).json({
      error: "text cannot exceed 5000 characters"
    });
  }

  const job = createJob(type, { text });

  res.status(202).json({
    message: "Job accepted",
    job
  });
});

app.get("/jobs", (req, res) => {
  const { status, type } = req.query;

  let results = [...jobs.values()];

  if (status) {
    results = results.filter((job) => job.status === status);
  }

  if (type) {
    results = results.filter((job) => job.type === type);
  }

  results.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({
    count: results.length,
    jobs: results
  });
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

app.delete("/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found"
    });
  }

  if (job.status === "processing") {
    return res.status(409).json({
      error: "A processing job cannot be deleted"
    });
  }

  jobs.delete(req.params.id);

  const queueIndex = queue.findIndex(
    (queuedJob) => queuedJob.id === req.params.id
  );

  if (queueIndex !== -1) {
    queue.splice(queueIndex, 1);
  }

  res.json({
    message: "Job deleted successfully"
  });
});

app.get("/queue/status", (req, res) => {
  const allJobs = [...jobs.values()];

  res.json({
    queued: allJobs.filter((job) => job.status === "queued").length,
    processing: allJobs.filter(
      (job) => job.status === "processing"
    ).length,
    completed: allJobs.filter(
      (job) => job.status === "completed"
    ).length,
    failed: allJobs.filter(
      (job) => job.status === "failed"
    ).length,
    queueLength: queue.length,
    isProcessing
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Job Queue API running at http://localhost:${PORT}`);
});