const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const uploadRoutes = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', uploadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`File Upload Service running on port ${PORT}`));