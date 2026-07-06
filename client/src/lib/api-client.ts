import type { HealthResponse, SessionResponse } from '@clientflow/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function apiAssetUrl(path: string) {
  return `${API_URL}${path}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string;
  issues?: Record<string, string[]>;
}

async function authenticatedFetch(
  path: string,
  options?: RequestInit,
  canRefresh = true,
) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (
    response.status === 401 &&
    canRefresh &&
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    path !== '/auth/register'
  ) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (refreshResponse.ok) {
      return authenticatedFetch(path, options, false);
    }
  }

  return response;
}

export async function request<T>(
  path: string,
  options?: RequestInit,
  canRefresh = true,
): Promise<T> {
  const response = await authenticatedFetch(path, options, canRefresh);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;

    throw new ApiError(
      body?.message ?? 'Something went wrong. Please try again.',
      response.status,
      body?.issues,
    );
  }

  return response.json() as Promise<T>;
}

export async function downloadFile(path: string, fallbackFilename: string) {
  const response = await authenticatedFetch(path);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;

    throw new ApiError(
      body?.message ?? 'The PDF could not be downloaded. Please try again.',
      response.status,
      body?.issues,
    );
  }

  const disposition = response.headers.get('Content-Disposition');
  const filename =
    disposition?.match(/filename="([^"]+)"/i)?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  session: () => request<SessionResponse>('/auth/me'),
};
