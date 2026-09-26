const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('crypto').randomUUID;

const app = express();
const PORT = process.env.PORT || 3052;

app.use(cors());
app.use(express.json());

// In-memory job store
const jobs = new Map();

// Simulate async job processing
const processJob = async (jobId, type, payload) => {
  const job = jobs.get(jobId);
  
  try {
    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    // Simulate work based on job type
    const workTime = type === 'slow' ? 5000 : 2000;
    await new Promise(resolve => setTimeout(resolve, workTime));

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.result = {
      message: `Job ${type} completed successfully`,
      processedPayload: payload,
      duration: workTime
    };

    // Send webhook if configured
    if (job.webhookUrl) {
      try {
        await fetch(job.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            status: 'completed',
            result: job.result
          })
        });
        job.webhookSent = true;
      } catch (err) {
        job.webhookError = err.message;
      }
    }
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.failedAt = new Date().toISOString();
  }
};

// Create a new job
app.post('/api/jobs', (req, res) => {
  const { type = 'fast', payload, webhookUrl } = req.body;

  const jobId = uuidv4();
  const job = {
    id: jobId,
    type,
    payload,
    webhookUrl,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
    webhookSent: false,
    webhookError: null
  };

  jobs.set(jobId, job);

  // Start processing asynchronously
  processJob(jobId, type, payload);

  res.status(201).json({
    jobId,
    status: 'queued',
    message: 'Job created. Poll /api/jobs/:id for status.'
  });
});

// Get job status
app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// List all jobs
app.get('/api/jobs', (req, res) => {
  const allJobs = Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(allJobs);
});

// Cancel a job (if still queued)
app.delete('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status === 'processing' || job.status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel job in current status' });
  }

  job.status = 'cancelled';
  job.cancelledAt = new Date().toISOString();
  
  res.json({ message: 'Job cancelled', job });
});

// Webhook test endpoint (to receive callbacks)
app.post('/webhook-test', (req, res) => {
  console.log('📬 Webhook received:', req.body);
  res.json({ received: true });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeJobs: jobs.size,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Job Queue running on http://localhost:${PORT}`);
  console.log(`Webhook test endpoint: http://localhost:${PORT}/webhook-test`);
});