import type { ErrorCode } from '@app/shared';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, 'unauthorized', 'Нужно войти заново');
export const invalidCode = () => new ApiError(400, 'invalid_code', 'Код не подошёл или устарел');
export const invalidInvite = () =>
  new ApiError(400, 'invalid_invite', 'Код приглашения не подошёл или больше не действует');
