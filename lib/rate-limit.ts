import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, key) => {
      if (record.resetTime <= now) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return '127.0.0.1';
}

export interface RateLimitOptions {
  limit: number;      // Maximum allowed requests in window
  windowSec: number;  // Time window in seconds
  identifier?: string; // Custom identifier suffix (e.g. action name)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * In-memory sliding window rate limiter
 */
export function checkRateLimit(
  req: Request | NextRequest, 
  options: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(req);
  const actionKey = options.identifier ? `:${options.identifier}` : '';
  const key = `${ip}${actionKey}`;

  const now = Date.now();
  const windowMs = options.windowSec * 1000;
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetTime <= now) {
    // New window
    const resetTime = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: Math.ceil(resetTime / 1000)
    };
  }

  // Existing active window
  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: Math.ceil(existing.resetTime / 1000)
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - existing.count,
    reset: Math.ceil(existing.resetTime / 1000)
  };
}
