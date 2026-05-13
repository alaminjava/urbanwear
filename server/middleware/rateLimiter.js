function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 300 } = {}) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    if (req.method === "OPTIONS" || req.path === "/health") return next();

    const now = Date.now();
    const key = req.ip || req.headers["x-forwarded-for"] || "anonymous";
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (record.resetAt <= now) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      res.setHeader("Retry-After", Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }

    return next();
  };
}

module.exports = createRateLimiter;
