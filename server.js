const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Job', jobSchema);