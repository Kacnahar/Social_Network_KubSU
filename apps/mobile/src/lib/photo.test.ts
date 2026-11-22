import { MEDIA_MAX_BYTES } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { checkPhoto } from './photo';

describe('проверка фото', () => {
  it('пропускает обычное фото', () => {
    expect(checkPhoto(new Blob(['x'], { type: 'image/webp' }))).toBeNull();
  });

  it('отклоняет другой тип файла', () => {
    expect(checkPhoto(new Blob(['x'], { type: 'image/gif' }))).toBe('Подходят только JPEG, PNG и WebP');
  });

  it('отклоняет слишком большое фото', () => {
    const big = new Blob([new Uint8Array(MEDIA_MAX_BYTES + 1)], { type: 'image/png' });
    expect(checkPhoto(big)).toBe('Фото больше 10 МБ');
  });
});
