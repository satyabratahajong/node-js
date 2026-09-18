const express = require('express');
const router = express.Router();

// For simplicity, rooms are just string IDs; you can add a Room model later.
router.get('/', (req, res) => {
  // Example static list; replace with DB logic if you add a Room model.
  res.json([{ id: 'general', name: 'General' }, { id: 'random', name: 'Random' }]);
});

module.exports = router;