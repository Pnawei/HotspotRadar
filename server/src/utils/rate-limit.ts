// 轻量内存限流中间件（固定窗口），无需额外依赖

import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max } = options;
  const buckets = new Map<string, Bucket>();

  // 周期性清理过期桶，避免内存无限增长
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  // 不阻止进程退出
  timer.unref?.();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count));

    if (bucket.count > max) {
      res.status(429).json({
        code: 429,
        message: options.message || '请求过于频繁，请稍后再试',
        data: null,
      });
      return;
    }

    next();
  };
}
