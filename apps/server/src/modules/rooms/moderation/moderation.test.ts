import { roomStateSchema } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomReports, roomSanctions, roomVoteBallots, roomVotes, rooms, slots } from '../../../db/schema';
import { createTestContext, type TestContext } from '../../../testing';
import { liftExpiredMutes } from './service';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date('2026-11-23T17:10:00.000Z');

type Member = { token: string; personaId: string };

describe('модерация комнат', () => {
  let t: TestContext;
  let slotId: string;
  let roomId: string;
  let voiceName: string;
  let people: Member[];

  const call = (method: string, url: string, token: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url, headers: t.authed(token), ...(payload === undefined ? {} : { payload: payload as object }) });
  const member = async (index: number): Promise<Member> => {
    const token = await t.registerAs('student', `s${index}@example.com`);
    const me = await call('PUT', '/v1/rooms/me/nickname', token, { nickname: `Участник_${index}` });
    return { token, personaId: me.json().personaId };
  };
  const addSlot = async (startsAt: Date) => {
    const [slot] = await t.db.insert(slots).values({ title: 'Комната', startsAt, durationMinutes: 600, createdAt: NOW }).returning();
    return slot!.id;
  };
  // Все заходят в комнату и «на связи» на сервере звука
  const enter = async (members: Member[], slot: string = slotId) => {
    let id = '';
    for (const person of members) id = (await call('POST', `/v1/rooms/slots/${slot}/join`, person.token)).json().roomId;
    const [room] = (await t.db.select().from(rooms)).filter((row) => row.id === id);
    t.voice.present.set(room!.voiceRoomName, new Set(members.map((person) => person.personaId)));
    return { roomId: id, voiceName: room!.voiceRoomName };
  };
  const state = async (who: Member, room: string = roomId) => roomStateSchema.parse((await call('GET', `/v1/rooms/${room}/state`, who.token)).json());
  const start = (who: Member, type: 'kick' | 'mute', target: Member, room: string = roomId) =>
    call('POST', `/v1/rooms/${room}/votes`, who.token, { type, targetPersonaId: target.personaId });
  const ballot = async (who: Member, room: string = roomId) =>
    call('POST', `/v1/rooms/votes/${(await state(who, room)).vote!.voteId}/ballot`, who.token);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t = await createTestContext();
    people = [];
    for (let index = 1; index <= 5; index++) people.push(await member(index));
    slotId = await addSlot(new Date(NOW.getTime() - MINUTE));
    ({ roomId, voiceName } = await enter(people));
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  describe('выключить микрофон', () => {
    it('проходит при двух голосах: сервер звука запрещает говорить на 10 минут, потом возвращает', async () => {
      const [a, b, target] = people as [Member, Member, Member];
      expect((await start(a, 'mute', target)).statusCode).toBe(200);
      let seen = await state(b);
      expect(seen.vote).toMatchObject({ type: 'mute', targetPersonaId: target.personaId, votesFor: 1, votesNeeded: 2, iVoted: false, isAboutMe: false });
      expect((await state(target)).vote?.isAboutMe).toBe(true);
      expect((await state(a)).vote?.iVoted).toBe(true);

      expect((await ballot(b)).statusCode).toBe(200);
      expect(t.voice.publishChanges).toEqual([{ roomName: voiceName, identity: target.personaId, canPublish: false }]);
      seen = await state(target);
      expect(seen.vote).toBeNull();
      expect(seen.lastResult).toMatchObject({ type: 'mute', passed: true });
      expect(seen.mutedUntil).toBe(new Date(NOW.getTime() + 10 * MINUTE).toISOString());
      expect((await state(a)).mutedUntil).toBeNull();

      const deps = { db: t.db, voice: t.voice, onError: () => undefined };
      vi.setSystemTime(NOW.getTime() + 9 * MINUTE);
      await liftExpiredMutes(deps, new Date());
      expect(t.voice.publishChanges).toHaveLength(1);
      vi.setSystemTime(NOW.getTime() + 10 * MINUTE);
      await liftExpiredMutes(deps, new Date());
      await liftExpiredMutes(deps, new Date());
      expect(t.voice.publishChanges.at(-1)).toEqual({ roomName: voiceName, identity: target.personaId, canPublish: true });
      expect(t.voice.publishChanges).toHaveLength(2);
      expect((await state(target)).mutedUntil).toBeNull();
    });

    it('перезаход в комнату не возвращает микрофон', async () => {
      const [a, b, target] = people as [Member, Member, Member];
      await start(a, 'mute', target);
      await ballot(b);
      await call('POST', `/v1/rooms/slots/${slotId}/join`, target.token);
      expect(t.voice.tokens.at(-1)).toMatchObject({ identity: target.personaId, canPublish: false });
      await call('POST', `/v1/rooms/slots/${slotId}/join`, a.token);
      expect(t.voice.tokens.at(-1)).toMatchObject({ identity: a.personaId, canPublish: true });
    });
  });

  describe('выгнать', () => {
    it('впятером нужно 3 голоса; после третьего человека отключают и закрывают вход во все комнаты на сутки', async () => {
      const [a, b, c, target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      expect((await state(a)).vote).toMatchObject({ votesFor: 1, votesNeeded: 3 });
      await ballot(b);
      expect(t.voice.removed).toEqual([]);
      await ballot(c);
      expect(t.voice.removed).toEqual([{ roomName: voiceName, identity: target.personaId }]);

      const seen = await state(target);
      expect(seen.blockedUntil).toBe(new Date(NOW.getTime() + 24 * HOUR).toISOString());
      const other = await addSlot(new Date(NOW.getTime() + MINUTE));
      for (const slot of [slotId, other]) {
        const denied = await call('POST', `/v1/rooms/slots/${slot}/join`, target.token);
        expect(denied.statusCode).toBe(403);
        expect(denied.json().error.code).toBe('room_blocked');
      }
      vi.setSystemTime(NOW.getTime() + 24 * HOUR + 1000);
      await addSlot(new Date(Date.now() - MINUTE));
      const later = (await t.db.select().from(slots)).at(-1)!;
      expect((await call('POST', `/v1/rooms/slots/${later.id}/join`, target.token)).statusCode).toBe(200);
    });

    it('повторный голос одного человека не считается; голос самого обвиняемого не принимается', async () => {
      const [a, b, , target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      await ballot(a);
      await ballot(b);
      await ballot(b);
      expect((await state(a)).vote?.votesFor).toBe(2);
      const own = await ballot(target);
      expect(own.json().error.code).toBe('vote_not_possible');
      expect(t.voice.removed).toEqual([]);
    });

    it('втроём выгнать нельзя, а выключить микрофон можно', async () => {
      const trio = people.slice(0, 3) as [Member, Member, Member];
      t.voice.present.set(voiceName, new Set(trio.map((person) => person.personaId)));
      const kick = await start(trio[0], 'kick', trio[2]);
      expect(kick.statusCode).toBe(409);
      expect(kick.json().error.code).toBe('vote_not_possible');
      expect((await start(trio[0], 'mute', trio[2])).statusCode).toBe(200);
    });

    it('в комнате на 10 человек нужно уже 4 голоса', async () => {
      for (let index = 6; index <= 10; index++) people.push(await member(index));
      ({ roomId, voiceName } = await enter(people));
      await start(people[0]!, 'kick', people[9]!);
      expect((await state(people[1]!)).vote?.votesNeeded).toBe(4);
      await ballot(people[1]!);
      await ballot(people[2]!);
      expect(t.voice.removed).toEqual([]);
      await ballot(people[3]!);
      expect(t.voice.removed).toHaveLength(1);
    });
  });

  describe('ограничения', () => {
    it('в комнате одно голосование одновременно', async () => {
      const [a, b, c, d] = people as [Member, Member, Member, Member];
      await start(a, 'mute', c);
      const second = await start(b, 'mute', d);
      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe('vote_in_progress');
    });

    it('окно — 60 секунд: не набрали — голосование провалено, опоздавший голос не принимается', async () => {
      const [a, b, , target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      const voteId = (await state(a)).vote!.voteId;
      vi.setSystemTime(NOW.getTime() + 61 * 1000);
      const late = await call('POST', `/v1/rooms/votes/${voteId}/ballot`, b.token);
      expect(late.json().error.code).toBe('vote_not_possible');
      const seen = await state(a);
      expect(seen.vote).toBeNull();
      expect(seen.lastResult).toMatchObject({ voteId, passed: false });
      vi.setSystemTime(NOW.getTime() + 90 * 1000);
      expect((await state(a)).lastResult).toBeNull();
    });

    it('против одного человека — не чаще раза в 10 минут, даже другим видом голосования', async () => {
      const [a, b, , target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      vi.setSystemTime(NOW.getTime() + 2 * MINUTE);
      const again = await start(b, 'mute', target);
      expect(again.statusCode).toBe(409);
      expect(again.json().error.code).toBe('vote_cooldown');
      expect((await start(b, 'mute', a)).statusCode).toBe(200);
      vi.setSystemTime(NOW.getTime() + 10 * MINUTE + 1000);
      expect((await start(b, 'mute', target)).statusCode).toBe(200);
    });

    it('голосовать может только тот, кто сейчас в комнате, и только против того, кто в ней', async () => {
      const outsider = await member(99);
      const [a, , , target] = people as [Member, Member, Member, Member];
      expect((await start(outsider, 'mute', target)).statusCode).toBe(403);
      expect((await start(a, 'mute', outsider)).json().error.code).toBe('vote_not_possible');
      expect((await start(a, 'mute', a)).json().error.code).toBe('vote_not_possible');
      await start(a, 'mute', target);
      expect((await call('POST', `/v1/rooms/votes/${(await state(a)).vote!.voteId}/ballot`, outsider.token)).statusCode).toBe(403);
    });

    it('кто именно голосовал, в ответе не раскрывается', async () => {
      const [a, b, , target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      await ballot(b);
      const raw = (await call('GET', `/v1/rooms/${roomId}/state`, target.token)).body;
      expect(raw).not.toContain(a.personaId);
      expect(raw).not.toContain(b.personaId);
      expect(await t.db.select().from(roomVoteBallots)).toHaveLength(2);
    });

    it('кривые данные и несуществующая комната', async () => {
      const [a, , , target] = people as [Member, Member, Member, Member];
      expect((await call('POST', `/v1/rooms/${roomId}/votes`, a.token, { type: 'ban', targetPersonaId: target.personaId })).statusCode).toBe(400);
      expect((await call('GET', '/v1/rooms/00000000-0000-4000-8000-000000000000/state', a.token)).statusCode).toBe(404);
      expect((await call('POST', '/v1/rooms/votes/00000000-0000-4000-8000-000000000000/ballot', a.token)).statusCode).toBe(404);
    });

    it('если сервер звука недоступен — понятная ошибка, голосование не создаётся', async () => {
      const [a, , , target] = people as [Member, Member, Member, Member];
      t.voice.down = true;
      const response = await start(a, 'mute', target);
      expect(response.statusCode).toBe(503);
      expect(await t.db.select().from(roomVotes)).toHaveLength(0);
    });
  });

  describe('автобан', () => {
    it('выгнали из трёх разных комнат за 7 дней — вход закрыт на 7 дней', async () => {
      const [a, b, c, target] = people as [Member, Member, Member, Member];
      const kickIn = async (dayOffset: number) => {
        vi.setSystemTime(NOW.getTime() + dayOffset * DAY);
        const slot = await addSlot(new Date(Date.now() - 2 * MINUTE));
        const entered = await enter([a, b, c, target], slot);
        await start(a, 'kick', target, entered.roomId);
        await ballot(b, entered.roomId);
        await ballot(c, entered.roomId);
        return entered.roomId;
      };
      await kickIn(0);
      await kickIn(2);
      expect((await t.db.select().from(roomSanctions)).filter((row) => row.type === 'rooms_ban')).toHaveLength(0);
      const third = await kickIn(4);

      const bans = (await t.db.select().from(roomSanctions)).filter((row) => row.type === 'rooms_ban');
      expect(bans).toHaveLength(1);
      expect(bans[0]).toMatchObject({ source: 'auto', personaId: target.personaId });
      expect((await state(target, third)).blockedUntil).toBe(new Date(NOW.getTime() + 11 * DAY).toISOString());

      vi.setSystemTime(NOW.getTime() + 6 * DAY);
      const slot = await addSlot(new Date(Date.now() - 3 * MINUTE));
      expect((await call('POST', `/v1/rooms/slots/${slot}/join`, target.token)).json().error.code).toBe('room_blocked');
    });

    it('смена ника от блокировки не спасает', async () => {
      const [a, b, c, target] = people as [Member, Member, Member, Member];
      await start(a, 'kick', target);
      await ballot(b);
      await ballot(c);
      await t.db.execute(`update room_personas set nickname_changed_at = null`);
      expect((await call('PUT', '/v1/rooms/me/nickname', target.token, { nickname: 'Новый_ник' })).statusCode).toBe(200);
      expect((await call('POST', `/v1/rooms/slots/${slotId}/join`, target.token)).json().error.code).toBe('room_blocked');
    });
  });

  describe('заглушить для себя и жалобы', () => {
    it('личная заглушка видна только мне и снимается', async () => {
      const [a, b, c] = people as [Member, Member, Member];
      expect((await call('PUT', `/v1/rooms/me/mutes/${c.personaId}`, a.token)).statusCode).toBe(200);
      await call('PUT', `/v1/rooms/me/mutes/${c.personaId}`, a.token);
      expect((await state(a)).personalMutes).toEqual([c.personaId]);
      expect((await state(b)).personalMutes).toEqual([]);
      expect((await state(c)).personalMutes).toEqual([]);
      expect(t.voice.publishChanges).toEqual([]);

      expect((await call('DELETE', `/v1/rooms/me/mutes/${c.personaId}`, a.token)).statusCode).toBe(200);
      expect((await state(a)).personalMutes).toEqual([]);
      expect((await call('PUT', `/v1/rooms/me/mutes/${a.personaId}`, a.token)).statusCode).toBe(400);
      expect((await call('PUT', '/v1/rooms/me/mutes/00000000-0000-4000-8000-000000000000', a.token)).statusCode).toBe(404);
    });

    it('жалоба админам записывается; пустая отклоняется', async () => {
      const [a, , c] = people as [Member, Member, Member];
      const sent = await call('POST', '/v1/rooms/reports', a.token, { targetPersonaId: c.personaId, roomId, text: ' Оскорбляет ' });
      expect(sent.statusCode).toBe(200);
      expect(await t.db.select().from(roomReports)).toMatchObject([{ text: 'Оскорбляет', targetPersonaId: c.personaId, roomId, status: 'new' }]);
      expect((await call('POST', '/v1/rooms/reports', a.token, { text: '   ' })).statusCode).toBe(400);
      expect((await call('POST', '/v1/rooms/reports', a.token, { text: 'Без адресата' })).statusCode).toBe(200);
    });
  });
});
