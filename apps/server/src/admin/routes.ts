// Запросы АДМИНКИ. Каждый проходит через requireAdmin: права проверяет сервер, а не экран.

import {
  API_PREFIX,
  adminRoomsBanRequestSchema,
  reportStatusSchema,
  type AdminLogResponse,
  type AdminPostReportsResponse,
  type AdminRoomReportsResponse,
  type OkResponse,
} from '@app/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config';
import { authenticate } from '../core/auth/service';
import type { MediaStorage } from '../core/media/storage';
import type { Db } from '../db/client';
import type { VoiceGateway } from '../modules/rooms/voice/gateway';
import {
  banFromRooms,
  closeRoomReport,
  dismissPostReport,
  liftRoomsBan,
  listLog,
  listPostReports,
  listRoomReports,
  removeReportedRecord,
  requireAdmin,
  type AdminDeps,
} from './service';

const ADMIN_PREFIX = `${API_PREFIX}/admin`;
const idParam = z.uuid();
const statusQuery = reportStatusSchema.default('new');

export type AdminRouteDeps = {
  config: Config;
  db: Db;
  media: MediaStorage;
  voice: VoiceGateway | null;
};

type StatusQuery = { Querystring: { status?: string } };
type ReportParams = { Params: { reportId: string } };
type PersonaParams = { Params: { personaId: string } };

export function registerAdminRoutes(app: FastifyInstance, { config, db, media, voice }: AdminRouteDeps): void {
  const deps: AdminDeps = { db, media, voice, onError: (error) => app.log.error(error) };

  const whoIs = async (request: FastifyRequest) => {
    const session = await authenticate(db, request.headers.authorization);
    return requireAdmin(db, config, session.accountId);
  };

  // ---------- Жалобы на посты и комментарии ----------

  app.get<StatusQuery>(`${ADMIN_PREFIX}/reports/posts`, async (request): Promise<AdminPostReportsResponse> => {
    await whoIs(request);
    return listPostReports(db, statusQuery.parse(request.query.status));
  });

  app.post<ReportParams>(`${ADMIN_PREFIX}/reports/posts/:reportId/dismiss`, async (request): Promise<OkResponse> => {
    const admin = await whoIs(request);
    await dismissPostReport(db, admin, idParam.parse(request.params.reportId), new Date());
    return { ok: true };
  });

  app.post<ReportParams>(`${ADMIN_PREFIX}/reports/posts/:reportId/remove`, async (request): Promise<OkResponse> => {
    const admin = await whoIs(request);
    await removeReportedRecord(deps, admin, idParam.parse(request.params.reportId), new Date());
    return { ok: true };
  });

  // ---------- Жалобы из комнат ----------

  app.get<StatusQuery>(`${ADMIN_PREFIX}/reports/rooms`, async (request): Promise<AdminRoomReportsResponse> => {
    await whoIs(request);
    return listRoomReports(db, statusQuery.parse(request.query.status), new Date());
  });

  app.post<ReportParams>(`${ADMIN_PREFIX}/reports/rooms/:reportId/close`, async (request): Promise<OkResponse> => {
    const admin = await whoIs(request);
    await closeRoomReport(db, admin, idParam.parse(request.params.reportId), new Date());
    return { ok: true };
  });

  app.put<PersonaParams>(`${ADMIN_PREFIX}/rooms/personas/:personaId/ban`, async (request): Promise<OkResponse> => {
    const admin = await whoIs(request);
    const { days } = adminRoomsBanRequestSchema.parse(request.body);
    await banFromRooms(deps, admin, idParam.parse(request.params.personaId), days, new Date());
    return { ok: true };
  });

  app.delete<PersonaParams>(`${ADMIN_PREFIX}/rooms/personas/:personaId/ban`, async (request): Promise<OkResponse> => {
    const admin = await whoIs(request);
    await liftRoomsBan(db, admin, idParam.parse(request.params.personaId), new Date());
    return { ok: true };
  });

  // ---------- Журнал ----------

  app.get(`${ADMIN_PREFIX}/log`, async (request): Promise<AdminLogResponse> => listLog(db, await whoIs(request)));
}
