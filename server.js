const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const { v4: uuidv4 } = require('crypto').randomUUID;

const app = express();
const PORT = process.env.PORT || 3072;

app.use(cors());
app.use(express.json());

// In-memory job store
const jobs = new Map();

// Task types with handlers
const taskHandlers = {
  'log': (data) => {
    console.log(`[LOG] ${new Date().toISOString()}: ${data.message}`);
    return { logged: true };
  },
  'cleanup': (data) => {
    console.log(`[CLEANUP] Running cleanup for ${data.target}`);
    return { cleaned: data.target, timestamp: new Date().toISOString() };
  },
  'report': (data) => {
    console.log(`[REPORT] Generating ${data.type} report`);
    return { reportType: data.type, generated: true };
  },
  'backup': (data) => {
    console.log(`[BACKUP] Backing up ${data.source} to ${data.destination}`);
    return { backedUp: true, source: data.source };
  }
};

// Create a scheduled job
app.post('/api/jobs', (req, res) => {
  try {
    const { name, cronExpression, taskType, taskData, enabled = true } = req.body;

    if (!name || !cronExpression || !taskType) {
      return res.status(400).json({ error: 'name, cronExpression, and taskType required' });
    }

    if (!taskHandlers[taskType]) {
      return res.status(400).json({ error: `Unknown task type: ${taskType}` });
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      name,
      cronExpression,
      taskType,
      taskData: taskData || {},
      enabled,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null,
      runCount: 0,
      lastResult: null
    };

    // Schedule the job
    const scheduledTask = cron.schedule(cronExpression, async () => {
      if (!job.enabled) return;

      console.log(`Running job: ${name} (${jobId})`);
      
      try {
        const result = await taskHandlers[taskType](job.taskData);
        job.lastRun = new Date().toISOString();
        job.lastResult = { success: true, result, timestamp: job.lastRun };
        job.runCount++;
      } catch (err) {
        job.lastResult = { success: false, error: err.message, timestamp: new Date().toISOString() };
      }
    }, {
      scheduled: enabled
    });

    job.scheduledTask = scheduledTask;
    jobs.set(jobId, job);

    res.status(201).json({
      id: jobId,
      name,
      cronExpression,
      nextRun: scheduledTask.getNextDates(1)[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job', message: err.message });
  }
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const allJobs = Array.from(jobs.values()).map(job => ({
    id: job.id,
    name: job.name,
    cronExpression: job.cronExpression,
    taskType: job.taskType,
    enabled: job.enabled,
    lastRun: job.lastRun,
    nextRun: job.scheduledTask.getNextDates(1)[0],
    runCount: job.runCount,
    lastResult: job.lastResult
  }));
  
  res.json(allJobs);
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  res.json({
    id: job.id,
    name: job.name,
    cronExpression: job.cronExpression,
    taskType: job.taskType,
    taskData: job.taskData,
    enabled: job.enabled,
    lastRun: job.lastRun,
    nextRun: job.scheduledTask.getNextDates(1)[0],
    runCount: job.runCount,
    lastResult: job.lastResult
  });
});

// Enable/disable job
app.patch('/api/jobs/:id/toggle', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { enabled } = req.body;
  job.enabled = enabled;
  
  if (enabled) {
    job.scheduledTask.start();
  } else {
    job.scheduledTask.stop();
  }

  res.json({ id: job.id, enabled: job.enabled });
});

// Delete job
app.delete('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  job.scheduledTask.stop();
  jobs.delete(req.params.id);
  
  res.json({ message: 'Job deleted' });
});

// Run job immediately
app.post('/api/jobs/:id/run', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    const result = await taskHandlers[job.taskType](job.taskData);
    job.lastRun = new Date().toISOString();
    job.lastResult = { success: true, result, timestamp: job.lastRun };
    job.runCount++;
    
    res.json({ success: true, result });
  } catch (err) {
    job.lastResult = { success: false, error: err.message, timestamp: new Date().toISOString() };
    res.status(500).json({ error: 'Job execution failed', message: err.message });
  }
});

// Available task types
app.get('/api/task-types', (req, res) => {
  res.json({
    available: Object.keys(taskHandlers),
    descriptions: {
      log: 'Log a message to console',
      cleanup: 'Simulate cleanup task',
      report: 'Generate a report',
      backup: 'Simulate backup operation'
    }
  });
});

// Common cron expressions reference
app.get('/api/cron-reference', (req, res) => {
  res.json({
    examples: [
      { expression: '* * * * *', description: 'Every minute' },
      { expression: '0 * * * *', description: 'Every hour' },
      { expression: '0 0 * * *', description: 'Every day at midnight' },
      { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
      { expression: '0 0 1 * *', description: 'First day of every month' },
      { expression: '*/5 * * * *', description: 'Every 5 minutes' }
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeJobs: Array.from(jobs.values()).filter(j => j.enabled).length,
    totalJobs: jobs.size
  });
});

app.listen(PORT, () => {
  console.log(`Cron Scheduler running on http://localhost:${PORT}`);
  console.log('Check /api/cron-reference for cron expression examples');
});