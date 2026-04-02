import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === "true";

const noopLimiter = {
  limit: async () => ({ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }),
} as unknown as Ratelimit;

const redis = isRateLimitDisabled ? null : Redis.fromEnv();

export const loginRatelimit = isRateLimitDisabled
  ? noopLimiter
  : new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "ratelimit:login" });

export const setupRatelimit = isRateLimitDisabled
  ? noopLimiter
  : new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "ratelimit:setup" });

export const apiRatelimit = isRateLimitDisabled
  ? noopLimiter
  : new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "ratelimit:api" });

export function getRateLimitIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "anonymous";
  }
  const ip = forwarded.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "anonymous";
}
