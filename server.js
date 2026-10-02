const RateLimiter = require('./rateLimiter');

// Create limiter instance
const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10      // 10 requests per minute
});

function rateLimitMiddleware(req, res, next) {
  // Get client IP (handle proxies)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.connection?.remoteAddress || 
             'unknown';
  
  if (limiter.isAllowed(ip)) {
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', limiter.getRemaining(ip));
    res.setHeader('X-RateLimit-Window', limiter.windowMs / 1000);
    next();
  } else {
    res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('Retry-After', Math.ceil(limiter.windowMs / 1000));
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(limiter.windowMs / 1000)
    });
  }
}

module.exports = rateLimitMiddleware; 