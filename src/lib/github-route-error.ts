import { NextResponse } from "next/server";
import type { ApiErrorResponse, RateLimitInfo } from "@/lib/api-error";

type HeaderBag = Record<string, string | undefined> & {
  get?: (name: string) => string | null;
};

function readHeader(headers: HeaderBag | undefined, name: string) {
  if (!headers) return null;

  if (typeof headers.get === "function") {
    return headers.get(name);
  }

  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

function toNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRateLimitInfo(error: unknown): RateLimitInfo | undefined {
  const response = (error as { response?: { headers?: HeaderBag } })?.response;
  const headers = response?.headers;

  const remaining = toNumber(readHeader(headers, "x-ratelimit-remaining"));
  const resetEpoch = toNumber(readHeader(headers, "x-ratelimit-reset"));
  const retryAfterSeconds = toNumber(readHeader(headers, "retry-after"));
  const resource = readHeader(headers, "x-ratelimit-resource");
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status ??
    null;
  const message =
    (error as { message?: string })?.message ??
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    "";

  const limited =
    status === 429 || remaining === 0 || /rate limit/i.test(message);

  if (!limited) return undefined;

  return {
    limited: true,
    resetAt: resetEpoch ? new Date(resetEpoch * 1000).toISOString() : null,
    retryAfterSeconds,
    remaining,
    resource,
  };
}

export function toGitHubErrorResponse(error: unknown, fallback: string) {
  const rateLimit = extractRateLimitInfo(error);
  const status =
    rateLimit
      ? 429
      : (error as { status?: number })?.status ??
        (error as { response?: { status?: number } })?.response?.status ??
        500;

  const payload: ApiErrorResponse = rateLimit
    ? {
        error: "GitHub API rate limit reached.",
        code: "rate_limited",
        rateLimit,
      }
    : {
        error: fallback,
      };

  const headers = new Headers();
  if (rateLimit?.retryAfterSeconds) {
    headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
  }

  return NextResponse.json(payload, {
    status,
    headers,
  });
}
