import { describe, expect, it } from 'vitest';
import { isThemeChoice, resolveScheme, themeChoiceLabel } from './themeChoice';

describe('resolveScheme', () => {
  it('«как в системе» повторяет системную тему', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('явный выбор сильнее системной темы', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});

describe('isThemeChoice и подписи', () => {
  it('узнаёт только три значения', () => {
    expect(isThemeChoice('dark')).toBe(true);
    expect(isThemeChoice('auto')).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
  });

  it('называет выбор по-русски', () => {
    expect(themeChoiceLabel('system')).toBe('Как в системе');
    expect(themeChoiceLabel('dark')).toBe('Тёмная');
  });
});
