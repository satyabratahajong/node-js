class RateLimiter {
  constructor({ windowMs = 60000, maxRequests = 100 }) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // Map<ip, [timestamps]>
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(ts => now - ts < this.windowMs);
      if (valid.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, valid);
      }
    }
  }

  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let timestamps = this.requests.get(ip) || [];
    // Filter to only requests within the current window
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= this.maxRequests) {
      this.requests.set(ip, timestamps);
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }

  getRemaining(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.requests.get(ip) || [])
      .filter(ts => ts > windowStart);
    return Math.max(0, this.maxRequests - timestamps.length);
  }
}

module.exports = RateLimiter;