// Чистая логика админки: подписи карточек и сроков (без React, чтобы проверять тестами)
import { ADMIN_ROOMS_BAN_MAX_DAYS, type AdminPostReport, type AdminRoomReport, type PostPhoto } from '@app/shared';

export const MAX_PREVIEW_PHOTOS = 3;

// Сроки закрытия входа; не больше предела сервера
export const BAN_DAY_OPTIONS = ([1, 7, 30] as const)
  .filter((days) => days <= ADMIN_ROOMS_BAN_MAX_DAYS)
  .map((days) => ({ value: String(days), label: days === 1 ? '1 день' : `${days} дней` }));

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

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function blockedUntilText(blockedUntil: string): string {
  const date = new Date(blockedUntil);
  return `Вход в комнаты закрыт до ${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

export const logSubline = (entry: { adminLabel: string; byMe: boolean }, when: string): string =>
  `${entry.adminLabel}${entry.byMe ? ' · вы' : ''} · ${when}`;
