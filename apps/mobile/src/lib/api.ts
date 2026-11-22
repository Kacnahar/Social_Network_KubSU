// Ядро соцсети: общий клиент API и запросы входа, аккаунта и уведомлений
import {
  API_PREFIX,
  accountResponseSchema,
  authStartResponseSchema,
  authVerifyResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  myProfileResponseSchema,
  okResponseSchema,
  profileSchema,
  pushConfigResponseSchema,
  uploadMediaResponseSchema,
  type AccountResponse,
  type AuthStartRequest,
  type AuthStartResponse,
  type ErrorCode,
  type HealthResponse,
  type MediaPurpose,
  type MyProfileResponse,
  type Profile,
  type PushConfigResponse,
  type PushSubscribeRequest,
  type UpdateProfileRequest,
  type UploadMediaResponse,
} from '@app/shared';
import type { z } from 'zod';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 8000;
// Фото весит заметно больше обычного запроса
const UPLOAD_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'network_error',
    message: string,
  ) {
    super(message);
  }
}

const networkError = () => new ApiError('network_error', 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз');

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  // Готовые байты с собственным Content-Type (например, фото); вместо JSON-тела
  rawBody?: { data: Blob; contentType: string };
  token?: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.rawBody) headers['content-type'] = options.rawBody.contentType;
  else if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${options.baseUrl ?? API_URL}${API_PREFIX}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.rawBody ? options.rawBody.data : options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw networkError();
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(json);
    if (parsed.success) throw new ApiError(parsed.data.error.code, parsed.data.error.message);
    throw new ApiError('internal_error', 'Что-то пошло не так. Попробуйте позже');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError('internal_error', 'Сервер ответил непонятно. Попробуйте позже');
  return parsed.data;
}

export const fetchHealth = (baseUrl?: string): Promise<HealthResponse> =>
  request('/health', healthResponseSchema, { baseUrl });

export const authStart = (body: AuthStartRequest): Promise<AuthStartResponse> =>
  request('/auth/start', authStartResponseSchema, { method: 'POST', body });

export const authVerify = (email: string, code: string): Promise<string> =>
  request('/auth/verify', authVerifyResponseSchema, { method: 'POST', body: { email, code } }).then(
    (response) => response.token,
  );

export const logout = (token: string) => request('/auth/logout', okResponseSchema, { method: 'POST', token });

export const getAccount = (token: string): Promise<AccountResponse> =>
  request('/account', accountResponseSchema, { token });

export const getProfile = (token: string): Promise<Profile | null> =>
  request('/profile', myProfileResponseSchema, { token }).then((response: MyProfileResponse) => response.profile);

export const updateProfile = (token: string, body: UpdateProfileRequest): Promise<Profile> =>
  request('/profile', myProfileResponseSchema, { method: 'PUT', token, body }).then((response) => {
    if (!response.profile) throw new ApiError('internal_error', 'Сервер ответил непонятно. Попробуйте позже');
    return response.profile;
  });

export const getProfileById = (token: string, profileId: string): Promise<Profile> =>
  request(`/profiles/${encodeURIComponent(profileId)}`, profileSchema, { token });

export const uploadMedia = (token: string, purpose: MediaPurpose, blob: Blob): Promise<UploadMediaResponse> =>
  request(`/media?purpose=${purpose}`, uploadMediaResponseSchema, {
    method: 'POST',
    token,
    rawBody: { data: blob, contentType: blob.type },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

// Картинки отдаются без токена; путь уже содержит /v1, поэтому склеиваем только с адресом сервера
export const mediaUrl = (path: string | null): string | null => (path ? `${API_URL}${path}` : null);

export const deleteAccount = (token: string) => request('/account', okResponseSchema, { method: 'DELETE', token });

export const getPushConfig = (): Promise<PushConfigResponse> => request('/push/config', pushConfigResponseSchema);

export const subscribePush = (token: string, body: PushSubscribeRequest) =>
  request('/push/subscriptions', okResponseSchema, { method: 'POST', token, body });

export const unsubscribePush = (token: string, endpoint: string) =>
  request('/push/subscriptions', okResponseSchema, { method: 'DELETE', token, body: { endpoint } });
