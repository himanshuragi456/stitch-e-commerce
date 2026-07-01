import type { ApiError } from './types';

const BASE = import.meta.env.VITE_API_URL as string;

export class HttpError extends Error {
  status: number;
  data: ApiError;
  constructor(status: number, data: ApiError) {
    super(data.message ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  return localStorage.getItem('skc_admin_token');
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('skc_admin_token');
    localStorage.removeItem('skc_admin_staff');
    window.location.href = '/login';
    throw new HttpError(401, { message: 'Unauthenticated.' });
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) throw new HttpError(res.status, json as ApiError);

  return json as T;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),

  delete: <T = void>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST') =>
    apiRequest<T>(path, { method, body: formData }),
};
