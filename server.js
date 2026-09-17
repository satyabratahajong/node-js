const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid access token' });
  }
};