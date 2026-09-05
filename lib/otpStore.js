/**
 * Shared in-memory OTP store for Next.js API routes.
 * Uses a global variable to survive hot-module reloads in dev.
 * In production, replace with Redis or a database for multi-instance deployments.
 */

const globalForOTP = globalThis;

if (!globalForOTP._airfairOTPCache) {
  globalForOTP._airfairOTPCache = new Map();
}

/** @type {Map<string, { otp: string, expiresAt: number, attempts: number }>} */
export const OTP_CACHE = globalForOTP._airfairOTPCache;

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 5;
