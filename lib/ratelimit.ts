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
  // x-forwarded-for: pode conter lista "client, proxy1, proxy2" — pega o primeiro (cliente real)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip && ip.length > 0) return ip;
  }

  // x-real-ip: header alternativo usado por alguns proxies (nginx, Vercel)
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length > 0) return realIp;

  // cf-connecting-ip: header do Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && cfIp.length > 0) return cfIp;

  // Fallback com timestamp para evitar bucket compartilhado entre requisições anônimas
  // Isso efetivamente desabilita o rate limit para requests sem IP identificável
  // em vez de bloquear todos por um único usuário malicioso
  return `anonymous-${Date.now()}`;
}
