import { joinRoomResponseSchema, slotsResponseSchema } from '@app/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../app';
import { accounts, roomParticipations, rooms, slots } from '../../../db/schema';
import { createTestContext, type TestContext } from '../../../testing';
import { createLiveKitGateway } from '../voice/gateway';
import { closeFinishedRooms } from './service';

const MINUTE = 60 * 1000;
const NOW = new Date('2026-11-23T17:10:00.000Z');
const START = new Date('2026-11-23T17:00:00.000Z');

describe('комнаты', () => {
  let t: TestContext;
  let token: string;
  let slotId: string;
  const errors: unknown[] = [];

  const member = async (email: string, nickname: string) => {
    const memberToken = await t.register(email);
    await t.app.inject({ method: 'PUT', url: '/v1/rooms/me/nickname', headers: t.authed(memberToken), payload: { nickname } });
    return memberToken;
  };
  const addSlot = async (startsAt: Date, extra: Partial<typeof slots.$inferInsert> = {}) => {
    const [slot] = await t.db
      .insert(slots)
      .values({ title: 'Вечерняя комната', startsAt, durationMinutes: 45, createdAt: NOW, ...extra })
      .returning();
    return slot!.id;
  };
  const join = (as: string = token, slot: string = slotId) =>
    t.app.inject({ method: 'POST', url: `/v1/rooms/slots/${slot}/join`, headers: t.authed(as) });
  const leave = (roomId: string, as: string = token) =>
    t.app.inject({ method: 'POST', url: `/v1/rooms/${roomId}/leave`, headers: t.authed(as) });
  const personaIdOf = async (as: string) =>
    (await t.app.inject({ method: 'GET', url: '/v1/rooms/me', headers: t.authed(as) })).json().personaId as string;
  const voiceNameOf = async (roomId: string) =>
    (await t.db.select().from(rooms).where(eq(rooms.id, roomId)))[0]!.voiceRoomName;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    errors.length = 0;
    t = await createTestContext();
    token = await member('student@example.com', 'Ночной_кот');
    slotId = await addSlot(START);
  });

  afterEach(async () => {
    await t.close();
    vi.useRealTimers();
  });

  describe('вход', () => {
    it('выдаёт комнату, адрес сервера звука, пропуск и время окончания', async () => {
      const response = await join();
      expect(response.statusCode).toBe(200);
      const body = joinRoomResponseSchema.parse(response.json());
      expect(body.voiceUrl).toBe(t.voice.url);
      expect(body.endsAt).toBe('2026-11-23T17:45:00.000Z');
    });

    it('в пропуске на сервер звука — только персона и ник, и он действует до конца комнаты', async () => {
      const body = (await join()).json();
      const issued = t.voice.tokens[0]!;
      expect(issued.identity).toBe(await personaIdOf(token));
      expect(issued.name).toBe('Ночной_кот');
      expect(issued.roomName).toBe(await voiceNameOf(body.roomId));
      expect(issued.ttlSeconds).toBe(35 * 60 + 60);
    });

    it('требует входа в приложение', async () => {
      const response = await t.app.inject({ method: 'POST', url: `/v1/rooms/slots/${slotId}/join` });
      expect(response.statusCode).toBe(401);
    });

    it('не пускает без ника', async () => {
      const noNick = await t.register('nonick@example.com');
      const response = await join(noNick);
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('nickname_required');
    });

    it('пускает за 5 минут до начала, но не раньше', async () => {
      const later = await addSlot(new Date(NOW.getTime() + 6 * MINUTE));
      expect((await join(token, later)).json().error.code).toBe('room_not_open');
      vi.setSystemTime(NOW.getTime() + MINUTE);
      expect((await join(token, later)).statusCode).toBe(200);
    });

    it('не пускает после окончания и в отменённую комнату', async () => {
      const cancelled = await addSlot(new Date(NOW.getTime() - MINUTE), { status: 'cancelled' });
      expect((await join(token, cancelled)).json().error.code).toBe('room_not_open');
      vi.setSystemTime(START.getTime() + 45 * MINUTE);
      expect((await join()).json().error.code).toBe('room_not_open');
    });

    it('на несуществующую комнату отвечает 404, на кривой адрес — 400', async () => {
      expect((await join(token, '00000000-0000-4000-8000-000000000000')).statusCode).toBe(404);
      const bad = await join(token, 'not-an-id');
      expect(bad.statusCode).toBe(400);
      expect(bad.json().error.code).toBe('validation_error');
    });

    it('не пускает забаненного, а после окончания бана — пускает', async () => {
      await t.db.update(accounts).set({ status: 'banned', bannedUntil: new Date(NOW.getTime() + 10 * MINUTE) });
      const response = await join();
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('account_banned');
      vi.setSystemTime(NOW.getTime() + 11 * MINUTE);
      expect((await join()).statusCode).toBe(200);
    });

    it('если сервер звука недоступен или не настроен — понятная ошибка, а не падение', async () => {
      t.voice.down = true;
      const down = await join();
      expect(down.statusCode).toBe(503);
      expect(down.json().error.code).toBe('voice_unavailable');

      const app = await buildApp({ config: t.config, db: t.db, mailer: t.mailer, push: null, voice: null, media: t.media, gifs: null });
      const missing = await app.inject({ method: 'POST', url: `/v1/rooms/slots/${slotId}/join`, headers: t.authed(token) });
      expect(missing.json().error.code).toBe('voice_unavailable');
      await app.close();
    });
  });

  describe('распределение по комнатам', () => {
    it('все попадают в одну комнату, пока в ней меньше 25 человек', async () => {
      const other = await member('other@example.com', 'Сова');
      const first = (await join()).json().roomId;
      t.voice.counts.set(await voiceNameOf(first), 24);
      expect((await join(other)).json().roomId).toBe(first);
    });

    it('когда в комнате 25 человек, открывается вторая; освободилось место — снова первая', async () => {
      const second = await member('second@example.com', 'Сова');
      const third = await member('third@example.com', 'Филин');
      const first = (await join()).json().roomId;
      t.voice.counts.set(await voiceNameOf(first), 25);

      const overflow = (await join(second)).json().roomId;
      expect(overflow).not.toBe(first);
      expect((await t.db.select().from(rooms)).map((room) => room.index).sort()).toEqual([1, 2]);

      t.voice.counts.set(await voiceNameOf(first), 20);
      expect((await join(third)).json().roomId).toBe(first);
    });

    it('после обрыва связи человек возвращается в свою комнату, даже если она уже полная', async () => {
      const first = (await join()).json().roomId;
      t.voice.counts.set(await voiceNameOf(first), 25);
      expect((await join()).json().roomId).toBe(first);
      expect(await t.db.select().from(roomParticipations)).toHaveLength(1);
    });

    it('у разных комнат разные случайные имена на сервере звука', async () => {
      const other = await addSlot(new Date(NOW.getTime() - MINUTE));
      const a = (await join()).json().roomId;
      const b = (await join(token, other)).json().roomId;
      expect(await voiceNameOf(a)).not.toBe(await voiceNameOf(b));
      expect(await voiceNameOf(a)).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('выход и закрытие', () => {
    it('выход отмечает время ухода; повторный выход и выход из чужой комнаты ничего не ломают', async () => {
      const roomId = (await join()).json().roomId;
      expect((await leave(roomId)).statusCode).toBe(200);
      const [participation] = await t.db.select().from(roomParticipations);
      expect(participation?.leftAt?.toISOString()).toBe(NOW.toISOString());

      expect((await leave(roomId)).statusCode).toBe(200);
      const other = await member('other@example.com', 'Сова');
      expect((await leave(roomId, other)).statusCode).toBe(200);
      expect((await leave('not-an-id')).statusCode).toBe(400);
    });

    it('после выхода можно войти снова — появляется новая запись о посещении', async () => {
      const roomId = (await join()).json().roomId;
      await leave(roomId);
      vi.setSystemTime(NOW.getTime() + MINUTE);
      expect((await join()).json().roomId).toBe(roomId);
      expect(await t.db.select().from(roomParticipations)).toHaveLength(2);
    });

    it('когда время вышло, комната закрывается на сервере звука и всем ставится время ухода', async () => {
      const roomId = (await join()).json().roomId;
      const deps = { db: t.db, voice: t.voice, onError: (error: unknown) => errors.push(error) };

      await closeFinishedRooms(deps, new Date(START.getTime() + 44 * MINUTE));
      expect(t.voice.closed).toEqual([]);

      const end = new Date(START.getTime() + 45 * MINUTE);
      await closeFinishedRooms(deps, end);
      await closeFinishedRooms(deps, new Date(end.getTime() + MINUTE));
      expect(t.voice.closed).toEqual([await voiceNameOf(roomId)]);
      const [room] = await t.db.select().from(rooms);
      expect(room?.closedAt?.toISOString()).toBe(end.toISOString());
      const [participation] = await t.db.select().from(roomParticipations);
      expect(participation?.leftAt?.toISOString()).toBe(end.toISOString());
    });

    it('отменённая комната закрывается сразу', async () => {
      await join();
      await t.db.update(slots).set({ status: 'cancelled' });
      await closeFinishedRooms({ db: t.db, voice: t.voice, onError: () => undefined }, NOW);
      expect(t.voice.closed).toHaveLength(1);
    });

    it('если сервер звука недоступен, закрытие повторится позже', async () => {
      await join();
      const deps = { db: t.db, voice: t.voice, onError: (error: unknown) => errors.push(error) };
      const end = new Date(START.getTime() + 45 * MINUTE);
      t.voice.down = true;
      await closeFinishedRooms(deps, end);
      expect((await t.db.select().from(rooms))[0]?.closedAt).toBeNull();
      expect(errors).toHaveLength(1);

      t.voice.down = false;
      await closeFinishedRooms(deps, new Date(end.getTime() + MINUTE));
      expect((await t.db.select().from(rooms))[0]?.closedAt).not.toBeNull();
    });
  });

  it('в расписании отмечено, куда можно войти прямо сейчас', async () => {
    await addSlot(new Date(NOW.getTime() + 4 * MINUTE), { title: 'Скоро' });
    await addSlot(new Date(NOW.getTime() + 60 * MINUTE), { title: 'Позже' });
    const response = await t.app.inject({ method: 'GET', url: '/v1/rooms/slots', headers: t.authed(token) });
    const list = slotsResponseSchema.parse(response.json()).slots;
    expect(list.map((slot) => [slot.title, slot.state, slot.joinable])).toEqual([
      ['Вечерняя комната', 'live', true],
      ['Скоро', 'upcoming', true],
      ['Позже', 'upcoming', false],
    ]);
  });
});

describe('пропуск на сервер звука (настоящая библиотека)', () => {
  it('разрешает только вход в свою комнату и звук с микрофона', async () => {
    const gateway = createLiveKitGateway({ url: 'ws://localhost:7880', apiUrl: 'http://127.0.0.1:7880', apiKey: 'devkey', apiSecret: 'secret' });
    const jwt = await gateway.createToken({ roomName: 'room-1', identity: 'persona-1', name: 'Ночной_кот', ttlSeconds: 600 });
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString('utf8'));

    expect(payload.sub).toBe('persona-1');
    expect(payload.name).toBe('Ночной_кот');
    expect(payload.video).toEqual({
      room: 'room-1',
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      canPublishSources: ['microphone'],
      canPublishData: false,
    });
    expect(payload.exp - payload.nbf).toBeLessThanOrEqual(600);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iss', 'name', 'nbf', 'sub', 'video']);
  });
});
