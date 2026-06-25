import { env, joinUrl } from '../config/env';
import { tokenStore } from '../services/tokenStore';
import type { ApiRequestOptions } from '../types/domain';

function withQuery(path: string, query?: ApiRequestOptions['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const suffix = params.toString();
  return suffix ? `${path}${path.includes('?') ? '&' : '?'}${suffix}` : path;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(options.headers);
  const body = options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body));

  if (!options.formData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(joinUrl(env.apiBaseUrl, withQuery(path, options.query)), {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

export function upload(path: string, formData: FormData) {
  return apiRequest(path, { method: 'POST', formData });
}

export async function apiBlob(path: string, options: Pick<ApiRequestOptions, 'method' | 'query' | 'headers'> = {}) {
  const token = tokenStore.get();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(joinUrl(env.apiBaseUrl, withQuery(path, options.query)), {
    method: options.method ?? 'GET',
    headers,
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new ApiError(response.status, payload || `Request failed with ${response.status}`, payload);
  }

  return response.blob();
}
