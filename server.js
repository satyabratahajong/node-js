const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const shortenerRoutes = require('./routes/shortener');

const app = express();
const PORT = process.env.PORT || 3022;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api', shortenerRoutes);

// Redirect route
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const Url = mongoose.model('Url');
  const record = await Url.findOne({ shortCode: code });
  if (!record) return res.status(404).send('Short URL not found');

  record.clicks += 1;
  record.lastClickedAt = new Date();
  await record.save();

  res.redirect(record.originalUrl);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`URL Shortener running on port ${PORT}`));