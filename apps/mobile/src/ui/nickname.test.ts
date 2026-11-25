import { describe, expect, it } from 'vitest';
import { checkNickname, normalizeNickname } from './nickname';

describe('никнейм', () => {
  it('убирает @ и приводит к строчным', () => {
    expect(normalizeNickname(' @Ivan.Petrov ')).toBe('ivan.petrov');
  });
  it('принимает верные', () => {
    expect(checkNickname('@ivan_p.01')).toEqual({ ok: true, value: 'ivan_p.01' });
  });
  it('отклоняет короткие, длинные и с лишними знаками', () => {
    expect(checkNickname('ab').ok).toBe(false);
    expect(checkNickname('a'.repeat(21)).ok).toBe(false);
    expect(checkNickname('иван_п').ok).toBe(false);
    expect(checkNickname('ivan petrov').ok).toBe(false);
    expect(checkNickname('ivan-p').ok).toBe(false);
  });
  it('занятое (заглушка) отклоняет', () => {
    expect(checkNickname('admin')).toMatchObject({ ok: false, reason: 'Этот никнейм занят' });
  });
});
