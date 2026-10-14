const express = require('express');
const crypto = require('crypto');
const app = express();

// Capture raw request body as buffer to ensure accurate signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const WEBHOOK_SECRET = 'your_super_secret_webhook_key';

app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing x-signature header' });
  }

  // Compute expected HMAC signature
  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid webhook signature' });
  }

  console.log('Verified Webhook Event Received:', req.body);
  res.json({ status: 'success', message: 'Webhook verified and processed' });
});

app.listen(3000, () => console.log('Webhook security receiver running on http://localhost:3000'));
