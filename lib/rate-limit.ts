import { NextResponse } from "next/server";

/**
 * Rate limiting en memoria, por instancia — igual que en vsl-platform.
 * Un límite distinto por scope: "track" es analítica de bajo riesgo (60/min);
 * "bold-link" crea links de pago reales contra la API de Bold, así que va
 * mucho más restringido (5/min) para que nadie lo use para saturar la cuenta.
 */

const WINDOW_MS = 60_000;
const LIMITES: Record<RateLimitScope, number> = {
  track: 60,
  "bold-link": 5,
};
const MAX_BUCKETS = 10_000;

const buckets = new Map<string, readonly number[]>();

export type RateLimitScope = "track" | "bold-link";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(scope: RateLimitScope, ip: string): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const limite = LIMITES[scope];

  const previous = buckets.get(key) ?? [];
  const fresh = previous.filter(ts => now - ts < WINDOW_MS);

  if (fresh.length >= limite) {
    buckets.set(key, fresh);
    const oldest = fresh[0];
    const retryMs = WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
  }

  buckets.set(key, [...fresh, now]);
  if (buckets.size > MAX_BUCKETS) pruneExpired(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneExpired(now: number): void {
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter(ts => now - ts < WINDOW_MS);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Demasiados intentos." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "desconocida";
}
