// Заглушка для iOS и Android: нативные уведомления появятся позже
export type PushStatus = 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on';

export const getPushStatus = async (): Promise<PushStatus> => 'unsupported';

export const enablePush = async (_token: string): Promise<PushStatus> => 'unsupported';

export const disablePush = async (_token: string | null): Promise<void> => undefined;
