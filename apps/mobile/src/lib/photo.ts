import { MEDIA_MAX_BYTES, MEDIA_TYPES } from '@app/shared';

// Проверка до отправки: серверу не нужно получать заведомо неподходящий файл
export function checkPhoto(blob: Blob): string | null {
  if (!(MEDIA_TYPES as readonly string[]).includes(blob.type)) return 'Подходят только JPEG, PNG и WebP';
  if (blob.size > MEDIA_MAX_BYTES) return `Фото больше ${MEDIA_MAX_BYTES / (1024 * 1024)} МБ`;
  return null;
}

// Фото по адресу из выбора: так работает и в браузере, и на телефоне
export async function readPhoto(uri: string): Promise<Blob> {
  const blob = await (await fetch(uri)).blob();
  // Если тип не определился, считаем JPEG: выбор фото сжимает именно в него
  return blob.type === '' ? new Blob([blob], { type: 'image/jpeg' }) : blob;
}
