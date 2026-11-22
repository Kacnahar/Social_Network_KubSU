import { describe, expect, it } from 'vitest';
import {
  BAN_DAY_OPTIONS,
  blockedUntilText,
  logSubline,
  photoPreview,
  postReportTitle,
  postReporterLabel,
  reportsOnTargetNote,
  resolutionLabel,
  roomReporterLabel,
  roomTargetLabel,
} from './format';

const author = { profileId: 'p', displayName: 'Анна', avatarUrl: null, role: 'student' as const };
const photo = (n: number) => ({ url: `/v1/media/${n}`, width: 10, height: 10 });

describe('подписи жалоб на записи', () => {
  it('заголовок по типу записи', () => {
    expect(postReportTitle('post')).toBe('Жалоба на пост');
    expect(postReportTitle('comment')).toBe('Жалоба на комментарий');
  });

  it('число жалоб показываем, только если их больше одной', () => {
    expect(reportsOnTargetNote(1)).toBeNull();
    expect(reportsOnTargetNote(3)).toBe('жалоб на эту запись: 3');
  });

  it('кто пожаловался', () => {
    expect(postReporterLabel(author)).toBe('Пожаловался: Анна');
    expect(postReporterLabel(null)).toBe('Пожаловался: аккаунт удалён');
  });

  it('итог разбора', () => {
    expect(resolutionLabel('removed')).toBe('Запись удалена');
    expect(resolutionLabel('dismissed')).toBe('Жалоба отклонена');
  });

  it('миниатюры: до трёх и счётчик остатка', () => {
    expect(photoPreview([photo(1), photo(2)])).toEqual({ shown: [photo(1), photo(2)], more: 0 });
    const five = [1, 2, 3, 4, 5].map(photo);
    expect(photoPreview(five)).toEqual({ shown: five.slice(0, 3), more: 2 });
    expect(photoPreview([])).toEqual({ shown: [], more: 0 });
  });
});

describe('подписи жалоб из комнат', () => {
  it('на кого', () => {
    expect(roomTargetLabel({ personaId: 'a', nickname: 'Лиса', blockedUntil: null })).toBe('На кого: Лиса');
    expect(roomTargetLabel({ personaId: 'a', nickname: null, blockedUntil: null })).toBe('На кого: без ника');
    expect(roomTargetLabel(null)).toBe('На кого: не указан');
  });

  it('от кого', () => {
    expect(roomReporterLabel({ personaId: 'a', nickname: 'Лиса' })).toBe('От кого: Лиса');
    expect(roomReporterLabel({ personaId: 'a', nickname: null })).toBe('От кого: без ника');
    expect(roomReporterLabel(null)).toBe('От кого: аккаунт удалён');
  });

  it('«закрыт до» содержит дату и время', () => {
    expect(blockedUntilText('2026-12-05T11:30:00.000Z')).toMatch(/^Вход в комнаты закрыт до \d{1,2} \S+, \d{2}:\d{2}$/);
  });

  it('варианты срока', () => {
    expect(BAN_DAY_OPTIONS).toEqual([
      { value: '1', label: '1 день' },
      { value: '7', label: '7 дней' },
      { value: '30', label: '30 дней' },
    ]);
  });
});

describe('журнал', () => {
  it('подпись под записью', () => {
    expect(logSubline({ adminLabel: 'Админ 1', byMe: true }, '5 минут назад')).toBe('Админ 1 · вы · 5 минут назад');
    expect(logSubline({ adminLabel: 'Админ 2', byMe: false }, 'вчера')).toBe('Админ 2 · вчера');
  });
});
