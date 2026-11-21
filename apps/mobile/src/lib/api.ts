import { API_PREFIX, healthResponseSchema, type HealthResponse } from '@rooms/shared';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 5000;

export async function fetchHealth(baseUrl: string = API_URL): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}${API_PREFIX}/health`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Сервер ответил с кодом ${response.status}`);
  }
  return healthResponseSchema.parse(await response.json());
}
