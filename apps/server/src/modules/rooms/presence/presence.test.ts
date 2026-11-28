import { roomStateSchema } from '@app/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomParticipations, roomSanctions, rooms, slots } from '../../../db/schema';
import { createTestContext, type TestContext } from '../../../testing';
import { PRESENCE_GRACE_MS, syncPresence } from './service';

const NOW = new Date('2026-12-01T17:00:00Z');
const MINUTE = 60 * 1000;

type Member = { token: string; personaId: string };

describe('комнаты: кто на самом деле в комнате и «рука»', () => {
  let t: TestContext;
  let slotId: string;
  let roomId: string;
  let voiceName: string;
  let people: Member[];
  const errors: unknown[] = [];

  const call = (method: string, url: string, token: string, payload?: unknown) =>
    t.app.inject({ method: method as 'GET', url, headers: t.authed(token), ...(payload === undefined ? {} : { payload: payload as object }) });
  const member = async (index: number): Promise<Member> => {
    const token = await t.registerAs('student', `p${index}@example.com`);
    const me = await call('PUT', '/v1/rooms/me/nickname', token, { nickname: `Гость_${index}` });
    return { token, personaId: me.json().personaId };
  };
  const present = () => t.voice.present.get(voiceName)!;
  const sync = () => syncPresence({ db: t.db, voice: t.voice, onError: (error) => errors.push(error) }, new Date());
  const openRecords = async () =>
    (await t.db.select().from(roomParticipations).where(and(eq(roomParticipations.roomId, roomId), isNull(roomParticipations.leftAt))))
      .map((row) => row.personaId)
      .sort();
  const ids = (members: Member[]) => members.map((person) => person.personaId).sort();
  const state = async (who: Member) => roomStateSchema.parse((await call('GET', `/v1/rooms/${roomId}/state`, who.token)).json());
  const pass = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms));

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    errors.length = 0;
    t = await createTestContext();
    people = [];
    for (let index = 1; index <= 5; index++) people.push(await member(index));
    const [slot] = await t.db.insert(slots).values({ title: 'Комната', startsAt: new Date(NOW.getTime() - MINUTE), durationMinutes: 600, createdAt: NOW }).returning();
    slotId = slot!.id;
    for (const person of people) roomId = (await call('POST', `/v1/rooms/slots/${slotId}/join`, person.token)).json().roomId;
    const [room] = await t.db.select().from(rooms).where(eq(rooms.id, roomId));
    voiceName = room!.voiceRoomName;
    t.voice.present.set(voiceName, new Set(people.map((person) => person.personaId)));
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  describe('сверка присутствия', () => {
    it('закрыл вкладку без «выйти» — уход отмечается сам, остальные остаются', async () => {
      present().delete(people[4]!.personaId);
      pass(PRESENCE_GRACE_MS);
      await sync();
      expect(await openRecords()).toEqual(ids(people.slice(0, 4)));
      expect(errors).toEqual([]);
    });

    it('только что вошёл и ещё подключается к звуку — запись не трогаем', async () => {
      present().delete(people[4]!.personaId);
      pass(PRESENCE_GRACE_MS - 1000);
      await sync();
      expect(await openRecords()).toEqual(ids(people));
    });

    it('вернулся на связь после обрыва — запись появляется снова, одна', async () => {
      present().delete(people[4]!.personaId);
      pass(PRESENCE_GRACE_MS);
      await sync();
      present().add(people[4]!.personaId);
      await sync();
      await sync();
      expect(await openRecords()).toEqual(ids(people));
    });

    it('посторонние идентификаторы на сервере звука в базу не попадают', async () => {
      present().add('load-test-bot-1');
      present().add('00000000-0000-4000-8000-000000000000');
      await sync();
      expect(await openRecords()).toEqual(ids(people));
      expect(errors).toEqual([]);
    });

    it('сервер звука недоступен — никого не «выписываем»', async () => {
      t.voice.down = true;
      pass(10 * MINUTE);
      await sync();
      expect(await openRecords()).toEqual(ids(people));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('закрытые комнаты не сверяются', async () => {
      await t.db.update(rooms).set({ closedAt: new Date() }).where(eq(rooms.id, roomId));
      t.voice.present.set(voiceName, new Set());
      pass(10 * MINUTE);
      await sync();
      expect(await openRecords()).toEqual(ids(people));
    });
  });

  describe('санкции держатся, даже если человек подключился к звуку в обход сервера', () => {
    const kick = async (target: Member) => {
      await call('POST', `/v1/rooms/${roomId}/votes`, people[0]!.token, { type: 'kick', targetPersonaId: target.personaId });
      const voteId = (await state(people[0]!)).vote!.voteId;
      await call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[1]!.token);
      await call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[2]!.token);
    };

    it('выгнанный вернулся со старым пропуском — сверка отключает его снова', async () => {
      const target = people[4]!;
      await kick(target);
      expect(present().has(target.personaId)).toBe(false);

      // Старый пропуск на сервер звука ещё действует: человек подключился напрямую
      present().add(target.personaId);
      t.voice.removed.length = 0;
      await sync();

      expect(t.voice.removed).toEqual([{ roomName: voiceName, identity: target.personaId }]);
      expect(await openRecords()).toEqual(ids(people.slice(0, 4)));
    });

    it('выключенный микрофон не возвращается переподключением', async () => {
      const target = people[4]!;
      await call('POST', `/v1/rooms/${roomId}/votes`, people[0]!.token, { type: 'mute', targetPersonaId: target.personaId });
      const voteId = (await state(people[0]!)).vote!.voteId;
      await call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[1]!.token);
      t.voice.publishChanges.length = 0;

      await sync();
      expect(t.voice.publishChanges).toEqual([{ roomName: voiceName, identity: target.personaId, canPublish: false }]);

      // Срок вышел — сверка больше не запрещает говорить
      pass(11 * MINUTE);
      t.voice.publishChanges.length = 0;
      await sync();
      expect(t.voice.publishChanges).toEqual([]);
    });

    it('два последних голоса одновременно: решение исполняется один раз', async () => {
      const target = people[4]!;
      await call('POST', `/v1/rooms/${roomId}/votes`, people[0]!.token, { type: 'kick', targetPersonaId: target.personaId });
      const voteId = (await state(people[0]!)).vote!.voteId;
      await call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[1]!.token);
      await Promise.all([
        call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[2]!.token),
        call('POST', `/v1/rooms/votes/${voteId}/ballot`, people[3]!.token),
      ]);
      const blocks = await t.db.select().from(roomSanctions).where(eq(roomSanctions.personaId, target.personaId));
      expect(blocks.filter((row) => row.type === 'room_block')).toHaveLength(1);
    });
  });

  describe('поднять руку', () => {
    const hand = (who: Member, raised: boolean, room: string = roomId) => call(raised ? 'PUT' : 'DELETE', `/v1/rooms/${room}/hand`, who.token);

    it('руку видят все в комнате, в порядке очереди; повторное «поднять» очередь не меняет', async () => {
      expect((await state(people[0]!)).raisedHands).toEqual([]);
      expect((await hand(people[2]!, true)).statusCode).toBe(200);
      pass(1000);
      await hand(people[0]!, true);
      pass(1000);
      await hand(people[2]!, true);
      expect((await state(people[4]!)).raisedHands).toEqual([people[2]!.personaId, people[0]!.personaId]);

      await hand(people[2]!, false);
      expect((await state(people[4]!)).raisedHands).toEqual([people[0]!.personaId]);
    });

    it('рука опускается сама: при выходе, при обрыве связи и когда выгнали', async () => {
      for (const person of people.slice(0, 3)) await hand(person, true);

      await call('POST', `/v1/rooms/${roomId}/leave`, people[0]!.token);
      present().delete(people[0]!.personaId);
      present().delete(people[1]!.personaId);
      pass(PRESENCE_GRACE_MS);
      await sync();
      expect((await state(people[4]!)).raisedHands).toEqual([people[2]!.personaId]);

      // Вернулся — рука уже опущена
      present().add(people[1]!.personaId);
      await sync();
      expect((await state(people[4]!)).raisedHands).toEqual([people[2]!.personaId]);
    });

    it('поднять руку можно только в комнате, где ты сейчас находишься', async () => {
      const outsider = await member(9);
      expect((await hand(outsider, true)).statusCode).toBe(409);
      expect((await hand(people[0]!, true, '00000000-0000-4000-8000-000000000000')).statusCode).toBe(409);
      expect((await hand(people[0]!, true, 'не-идентификатор')).statusCode).toBe(400);
    });

    it('преподавателю и гостю рука недоступна, как и все комнаты', async () => {
      const teacher = await t.registerAs('teacher', 'teacher@example.com');
      const guest = await t.registerAs('guest', 'guest@example.com');
      for (const token of [teacher, guest]) {
        expect((await call('PUT', `/v1/rooms/${roomId}/hand`, token)).statusCode).toBe(403);
      }
    });
  });
});
