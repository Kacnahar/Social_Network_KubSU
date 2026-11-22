// Чистая логика админки: подписи карточек и сроков (без React, чтобы проверять тестами)
import { banDateTimeText } from '../../lib/banText';
import { ADMIN_ACCOUNT_BAN_MAX_DAYS, ADMIN_ROOMS_BAN_MAX_DAYS, type AdminPostReport, type AdminRoomReport, type PostPhoto } from '@app/shared';

export const MAX_PREVIEW_PHOTOS = 3;

const dayOptions = (max: number) =>
  ([1, 7, 30] as const).filter((days) => days <= max).map((days) => ({ value: String(days), label: days === 1 ? '1 день' : `${days} дней` }));

// Сроки закрытия входа; не больше предела сервера
export const BAN_DAY_OPTIONS = dayOptions(ADMIN_ROOMS_BAN_MAX_DAYS);
export const ACCOUNT_BAN_DAY_OPTIONS = dayOptions(ADMIN_ACCOUNT_BAN_MAX_DAYS);

export const offenderBannedText = (bannedUntil: string): string => `Автору запрещено публиковать до ${banDateTimeText(bannedUntil)}`;

export const postReportTitle = (targetType: AdminPostReport['targetType']): string =>
  targetType === 'post' ? 'Жалоба на пост' : 'Жалоба на комментарий';

export const reportsOnTargetNote = (count: number): string | null => (count > 1 ? `жалоб на эту запись: ${count}` : null);

export const postReporterLabel = (reporter: AdminPostReport['reporter']): string =>
  `Пожаловался: ${reporter ? reporter.displayName : 'аккаунт удалён'}`;

export const resolutionLabel = (resolution: AdminPostReport['resolution']): string =>
  resolution === 'removed' ? 'Запись удалена' : 'Жалоба отклонена';

// Сколько фото показать миниатюрами и сколько осталось за кадром
export function photoPreview(photos: PostPhoto[]): { shown: PostPhoto[]; more: number } {
  return { shown: photos.slice(0, MAX_PREVIEW_PHOTOS), more: Math.max(0, photos.length - MAX_PREVIEW_PHOTOS) };
}

export const roomTargetLabel = (target: AdminRoomReport['target']): string =>
  `На кого: ${target ? (target.nickname ?? 'без ника') : 'не указан'}`;

export const roomReporterLabel = (reporter: AdminRoomReport['reporter']): string =>
  `От кого: ${reporter ? (reporter.nickname ?? 'без ника') : 'аккаунт удалён'}`;

export const blockedUntilText = (blockedUntil: string): string => `Вход в комнаты закрыт до ${banDateTimeText(blockedUntil)}`;

export const logSubline = (entry: { adminLabel: string; byMe: boolean }, when: string): string =>
  `${entry.adminLabel}${entry.byMe ? ' · вы' : ''} · ${when}`;
