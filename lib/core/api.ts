// CANONICAL: thin client-side fetch wrapper for the LienClock API envelope.
export interface ApiFailure {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
  status: number;
}

export type ApiResult<T> = { data: T; failure: null } | { data: null; failure: ApiFailure };

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.error) {
      return {
        data: null,
        failure: {
          message: (body?.error as string | undefined) ?? 'Something interrupted that request. Try again.',
          code: body?.code as string | undefined,
          details: body?.details as Record<string, string[]> | undefined,
          status: response.status,
        },
      };
    }
    return { data: body.data as T, failure: null };
  } catch {
    return {
      data: null,
      failure: { message: 'We could not reach the server. Check your connection and try again.', status: 0 },
    };
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(path);
}

export function apiSend<T = unknown>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}
