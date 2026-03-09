export interface RateLimitInfo {
  limited: boolean;
  resetAt: string | null;
  retryAfterSeconds: number | null;
  remaining: number | null;
  resource: string | null;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  rateLimit?: RateLimitInfo;
}

export async function readApiError(response: Response): Promise<ApiErrorResponse> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (typeof data?.error === "string") {
      return data;
    }
  } catch {
    // Fall through to the default error shape.
  }

  return {
    error: `Request failed with status ${response.status}`,
  };
}

export function isRateLimitApiError(error: ApiErrorResponse | null | undefined) {
  return error?.code === "rate_limited" || error?.rateLimit?.limited === true;
}

export function formatRateLimitMessage(
  rateLimit: RateLimitInfo | undefined,
  fallback = "GitHub API rate limit reached."
) {
  if (!rateLimit) return fallback;

  if (rateLimit.resetAt) {
    const resetTime = new Date(rateLimit.resetAt);
    return `${fallback} Retry after ${resetTime.toLocaleTimeString()}.`;
  }

  if (rateLimit.retryAfterSeconds) {
    return `${fallback} Retry in about ${rateLimit.retryAfterSeconds}s.`;
  }

  return fallback;
}

export function isRateLimitActive(rateLimit: RateLimitInfo | null | undefined) {
  if (!rateLimit?.limited) return false;

  if (rateLimit.resetAt) {
    return new Date(rateLimit.resetAt).getTime() > Date.now();
  }

  if (rateLimit.retryAfterSeconds) {
    return rateLimit.retryAfterSeconds > 0;
  }

  return true;
}
