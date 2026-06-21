/**
 * Shared API protection for server routes that use the private Apex API key.
 * It blocks obvious cross-site/direct production abuse and adds a small in-memory rate limit.
 */

import { NextRequest, NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type GuardOptions = {
  allowPublicMobileClient?: boolean;
  limit: number;
  routeKey: string;
  windowMs: number;
};

declare global {
  var __dropzoneRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

const buckets = globalThis.__dropzoneRateLimitBuckets ?? new Map<string, RateLimitBucket>();
globalThis.__dropzoneRateLimitBuckets = buckets;

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function isLocalHostAlias(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function hasSameOrigin(sourceOrigin: string, expectedOrigin: string) {
  if (sourceOrigin === expectedOrigin) return true;

  if (process.env.NODE_ENV === "production") return false;

  try {
    const source = new URL(sourceOrigin);
    const expected = new URL(expectedOrigin);

    return (
      source.protocol === expected.protocol &&
      source.port === expected.port &&
      isLocalHostAlias(source.hostname) &&
      isLocalHostAlias(expected.hostname)
    );
  } catch {
    return false;
  }
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expectedOrigin = request.nextUrl.origin;

  if (origin && hasSameOrigin(origin, expectedOrigin)) return true;
  try {
    if (referer && hasSameOrigin(new URL(referer).origin, expectedOrigin)) return true;
  } catch {
    return false;
  }

  // Local scripts and smoke tests often have no Origin/Referer; production should not.
  return process.env.NODE_ENV !== "production" && !origin && !referer;
}

function rateLimit(request: NextRequest, options: GuardOptions) {
  const now = Date.now();
  const key = `${options.routeKey}:${requestIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many tracker requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  current.count += 1;
  return null;
}

export function guardApiRequest(request: NextRequest, options: GuardOptions) {
  if (!options.allowPublicMobileClient && !hasTrustedOrigin(request)) {
    return NextResponse.json(
      { error: "This tracker endpoint only accepts same-origin app requests." },
      { status: 403 },
    );
  }

  return rateLimit(request, options);
}
