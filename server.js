const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor(concurrency = 2) {
    super();
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(jobData) {
    this.queue.push(jobData);
    this.process();
  }

  process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.running++;

    // Simulate async background task (e.g., sending email, video encoding)
    setTimeout(() => {
      console.log(`[Job Completed] Processed task ID: ${job.id}`);
      this.running--;
      this.process(); // Pick next job
    }, job.duration);
  }
}

// Usage Example
const myQueue = new JobQueue(2); // Max 2 concurrent workers

myQueue.add({ id: 1, duration: 2000 });
myQueue.add({ id: 2, duration: 1000 });
myQueue.add({ id: 3, duration: 1500 });
myQueue.add({ id: 4, duration: 500 });
