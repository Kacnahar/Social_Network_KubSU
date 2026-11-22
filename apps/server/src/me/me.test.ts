import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, type TestContext } from '../testing';

const DAY = 24 * 60 * 60 * 1000;

describe('ник и аккаунт', () => {
  let t: TestContext;
  let token: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    t = await createTestContext();
    token = await t.register('student@example.com');
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  const setNickname = (nickname: unknown, as: string = token) =>
    t.app.inject({ method: 'PUT', url: '/v1/me/nickname', headers: t.authed(as), payload: { nickname } });
  const getMe = (as: string = token) => t.app.inject({ method: 'GET', url: '/v1/me', headers: t.authed(as) });

  describe('ник', () => {
    it('задаётся в первый раз и возвращается в /me', async () => {
      const response = await setNickname('Ночной_кот');
      expect(response.statusCode).toBe(200);
      expect(response.json().nickname).toBe('Ночной_кот');

      const me = (await getMe()).json();
      expect(me.nickname).toBe('Ночной_кот');
      expect(new Date(me.nicknameChangeAvailableAt).getTime()).toBe(Date.now() + 30 * DAY);
    });

    it.each([
      ['слишком короткий', 'ab'],
      ['слишком длинный', 'a'.repeat(21)],
      ['с пробелом', 'два слова'],
      ['со знаками', '<script>'],
      ['пустой', ''],
    ])('отклоняет ник: %s', async (_name, nickname) => {
      const response = await setNickname(nickname);
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('nickname_invalid');
    });

    it('отклоняет ник не строкой', async () => {
      expect((await setNickname(123)).json().error.code).toBe('validation_error');
    });

    it('служебные имена выглядят как занятые', async () => {
      const response = await setNickname('Admin');
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('nickname_taken');
    });

    it('не даёт взять занятый ник, даже в другом регистре и с ё вместо е', async () => {
      await setNickname('Ёжик');
      const other = await t.register('other@example.com');
      for (const nickname of ['Ёжик', 'ёжик', 'ЕЖИК']) {
        const response = await setNickname(nickname, other);
        expect(response.statusCode).toBe(409);
        expect(response.json().error.code).toBe('nickname_taken');
      }
    });

    it('нельзя сменить раньше чем через 30 дней', async () => {
      await setNickname('Первый');
      vi.setSystemTime(Date.now() + 29 * DAY);
      const response = await setNickname('Второй');
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('nickname_change_too_soon');
      expect((await getMe()).json().nickname).toBe('Первый');
    });

    it('через 30 дней можно сменить, и старый ник освобождается', async () => {
      await setNickname('Первый');
      vi.setSystemTime(Date.now() + 30 * DAY + 1000);
      expect((await setNickname('Второй')).statusCode).toBe(200);

      const other = await t.register('other@example.com');
      expect((await setNickname('Первый', other)).statusCode).toBe(200);
    });

    it('повторная отправка того же ника ничего не ломает и не сдвигает срок', async () => {
      const first = (await setNickname('Тот_же')).json();
      vi.setSystemTime(Date.now() + DAY);
      const second = await setNickname('Тот_же');
      expect(second.statusCode).toBe(200);
      expect(second.json().nicknameChangeAvailableAt).toBe(first.nicknameChangeAvailableAt);
    });

    it('personaId не меняется при смене ника', async () => {
      const before = (await setNickname('Первый')).json().personaId;
      vi.setSystemTime(Date.now() + 31 * DAY);
      expect((await setNickname('Второй')).json().personaId).toBe(before);
    });
  });

  describe('аккаунт', () => {
    it('показывает статус без ника и идентификаторов', async () => {
      await setNickname('Ночной_кот');
      const response = await t.app.inject({ method: 'GET', url: '/v1/account', headers: t.authed(token) });
      expect(response.json()).toEqual({ status: 'active', bannedUntil: null });
    });

    it('удаляется вместе с ником; почту и ник потом можно занять заново', async () => {
      await setNickname('Ночной_кот');
      const removed = await t.app.inject({ method: 'DELETE', url: '/v1/account', headers: t.authed(token) });
      expect(removed.statusCode).toBe(200);
      expect((await getMe()).statusCode).toBe(401);

      vi.setSystemTime(Date.now() + 2 * 60 * 1000);
      const again = await t.register('student@example.com');
      expect((await getMe(again)).json().nickname).toBeNull();
      expect((await setNickname('Ночной_кот', again)).statusCode).toBe(200);
    });
  });
});
