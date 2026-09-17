const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Job = require('./models/Job');

const app = express();
const PORT = process.env.PORT || 3012;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const jobQueue = new Queue('email-jobs', process.env.REDIS_URL || 'redis://localhost:6379');

jobQueue.process(async (job) => {
  // This is just a placeholder; real work happens in worker.js conceptually
  // Here we just simulate delay and mark as done
  await new Promise(r => setTimeout(r, 2000));
  return { processed: true };
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject required' });
    }

    const jobId = uuidv4();
    const job = new Job({ jobId, to, subject, body, status: 'queued' });
    await job.save();

    await jobQueue.add({ jobId, to, subject, body }, { attempts: 3 });

    res.status(201).json({ jobId, status: 'queued' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Job Service running on port ${PORT}`));