// Запросы МОДУЛЯ «Голосовые комнаты». Все адреса начинаются с /v1/rooms.
// Наружу отдаётся только анонимная персона (personaId и ник) — ничего из аккаунта и профиля соцсети.

import {
  API_PREFIX,
  roomReportRequestSchema,
  setNicknameRequestSchema,
  startVoteRequestSchema,
  type JoinRoomResponse,
  type OkResponse,
  type RoomPersonaResponse,
  type RoomState,
  type SlotsResponse,
} from '@app/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/service';
import { requireCapability } from '../../core/account';
import { getOrCreatePersonaId } from '../../core/identity';
import type { Db } from '../../db/client';
import { joinSlot, leaveRoom } from './entry/service';
import { castBallot, getRoomState, reportToAdmins, setPersonalMute, startVote } from './moderation/service';
import { getPersona, setNickname } from './persona/service';
import { listUpcomingSlots } from './schedule/service';
import type { VoiceGateway } from './voice/gateway';

const ROOMS_PREFIX = `${API_PREFIX}/rooms`;
const idParam = z.uuid();

export type RoomsDeps = {
  db: Db;
  // null — сервер звука не настроен, войти в комнату нельзя
  voice: VoiceGateway | null;
};

export function registerRoomsRoutes(app: FastifyInstance, { db, voice }: RoomsDeps): void {
  // Вошедший пользователь соцсети → проверка роли → его анонимная персона комнат.
  // Через эту функцию проходит каждый запрос модуля: комнаты доступны только тем, у кого есть право rooms
  const whoIs = async (request: FastifyRequest) => {
    const session = await authenticate(db, request.headers.authorization);
    await requireCapability(db, session.accountId, 'rooms');
    return { accountId: session.accountId, personaId: await getOrCreatePersonaId(db, session.accountId, new Date()) };
  };

  // ---------- Персона: ник комнат ----------

  app.get(`${ROOMS_PREFIX}/me`, async (request): Promise<RoomPersonaResponse> =>
    getPersona(db, (await whoIs(request)).personaId),
  );

  app.put(`${ROOMS_PREFIX}/me/nickname`, async (request): Promise<RoomPersonaResponse> => {
    const { personaId } = await whoIs(request);
    const { nickname } = setNicknameRequestSchema.parse(request.body);
    return setNickname(db, personaId, nickname);
  });

  // ---------- Расписание ----------

  app.get(`${ROOMS_PREFIX}/slots`, async (request): Promise<SlotsResponse> => {
    await whoIs(request);
    return { slots: await listUpcomingSlots(db, new Date()) };
  });

  // ---------- Вход в комнату и выход ----------

  app.post<{ Params: { slotId: string } }>(`${ROOMS_PREFIX}/slots/:slotId/join`, async (request): Promise<JoinRoomResponse> => {
    const who = await whoIs(request);
    const slotId = idParam.parse(request.params.slotId);
    return joinSlot({ db, voice, onError: (error) => app.log.error(error) }, who, slotId, new Date());
  });

  app.post<{ Params: { roomId: string } }>(`${ROOMS_PREFIX}/:roomId/leave`, async (request): Promise<OkResponse> => {
    const { personaId } = await whoIs(request);
    const roomId = idParam.parse(request.params.roomId);
    await leaveRoom(db, personaId, roomId, new Date());
    return { ok: true };
  });

  // ---------- Модерация: голосования участников ----------

  const moderation = { db, voice, onError: (error: unknown) => app.log.error(error) };

  app.get<{ Params: { roomId: string } }>(`${ROOMS_PREFIX}/:roomId/state`, async (request): Promise<RoomState> => {
    const { personaId } = await whoIs(request);
    return getRoomState(moderation, personaId, idParam.parse(request.params.roomId), new Date());
  });

  app.post<{ Params: { roomId: string } }>(`${ROOMS_PREFIX}/:roomId/votes`, async (request): Promise<OkResponse> => {
    const { personaId } = await whoIs(request);
    const roomId = idParam.parse(request.params.roomId);
    await startVote(moderation, personaId, roomId, startVoteRequestSchema.parse(request.body), new Date());
    return { ok: true };
  });

  app.post<{ Params: { voteId: string } }>(`${ROOMS_PREFIX}/votes/:voteId/ballot`, async (request): Promise<OkResponse> => {
    const { personaId } = await whoIs(request);
    await castBallot(moderation, personaId, idParam.parse(request.params.voteId), new Date());
    return { ok: true };
  });

  // «Заглушить для себя»: видит и слышит это только сам человек
  for (const [method, muted] of [
    ['PUT', true],
    ['DELETE', false],
  ] as const) {
    app.route<{ Params: { personaId: string } }>({
      method,
      url: `${ROOMS_PREFIX}/me/mutes/:personaId`,
      handler: async (request): Promise<OkResponse> => {
        const me = await whoIs(request);
        await setPersonalMute(db, me.personaId, idParam.parse(request.params.personaId), muted);
        return { ok: true };
      },
    });
  }

  app.post(`${ROOMS_PREFIX}/reports`, async (request): Promise<OkResponse> => {
    const { personaId } = await whoIs(request);
    await reportToAdmins(db, personaId, roomReportRequestSchema.parse(request.body));
    return { ok: true };
  });
}
