import { describe, expect, it } from 'vitest';
import { banDateText, banDateTimeText, pausedBodyText, pausedUntilText } from './banText';

describe('тексты про бан', () => {
  it('дата без года, по-русски', () => {
    expect(banDateText('2026-11-29T12:00:00.000Z')).toMatch(/^\d{1,2} ноября$/);
  });

  it('дата и время', () => {
    expect(banDateTimeText('2026-11-29T12:00:00.000Z')).toMatch(/^\d{1,2} ноября, \d{2}:\d{2}$/);
  });

  it('строка в профиле', () => {
    expect(pausedUntilText('2026-11-29T12:00:00.000Z')).toMatch(/^Публикации на паузе до \d{1,2} ноября$/);
    expect(pausedUntilText(null)).toBe('Публикации на паузе');
  });

  it('текст экрана «Создать»', () => {
    expect(pausedBodyText('2026-11-29T12:00:00.000Z')).toMatch(
      /^Вам временно запрещено публиковать, лайкать и комментировать до \d{1,2} ноября\. Смотреть ленту и истории можно\.$/,
    );
    expect(pausedBodyText(null)).toBe('Вам временно запрещено публиковать, лайкать и комментировать. Смотреть ленту и истории можно.');
  });
});
