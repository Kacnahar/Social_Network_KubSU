// Админка: разбор жалоб, удаление чужих записей, блокировки в комнатах, журнал.
// Жалобы соцсети работают с профилем, жалобы комнат — с персоной. Связь «аккаунт ↔ персона»
// админка не читает: раскрытие личности по нику здесь не предусмотрено.

import {
  ADMIN_PAGE_SIZE,
  mediaPath,
  type AdminAction,
  type AdminLogResponse,
  type AdminPostReportsResponse,
  type AdminRoomReportsResponse,
  type Author,
  type ReportStatus,
} from '@app/shared';
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import type { Config } from '../config';
import { isBanned } from '../core/account';
import { ApiError, unauthorized } from '../core/errors';
import { deleteMedia, type MediaDeps } from '../core/media/service';
import type { Db } from '../db/client';
import {
  accounts,
  adminAuditLog,
  mediaFiles,
  personas,
  postComments,
  postPhotos,
  postReports,
  posts,
  profiles,
  roomParticipations,
  roomReports,
  roomSanctions,
  rooms,
} from '../db/schema';
import type { VoiceGateway } from '../modules/rooms/voice/gateway';

const DAY = 24 * 60 * 60 * 1000;

export type Admin = { accountId: string; label: string };

export type AdminDeps = MediaDeps & {
  // null — сервер звука не настроен
  voice: VoiceGateway | null;
  onError: (error: unknown) => void;
};

const notAdmin = () => new ApiError(403, 'forbidden', 'Этот раздел только для админов');
const notFound = (what: string) => new ApiError(404, 'not_found', what);

// Админ — тот, чья почта перечислена в настройках сервера. Возвращает null для остальных
export async function findAdmin(db: Db, config: Config, accountId: string): Promise<Admin | null> {
  if (config.adminEmailHashes.length === 0) return null;
  const [account] = await db.select({ emailHash: accounts.emailHash }).from(accounts).where(eq(accounts.id, accountId));
  if (!account) throw unauthorized();
  const index = config.adminEmailHashes.indexOf(account.emailHash);
  return index === -1 ? null : { accountId, label: `Админ ${index + 1}` };
}

export async function requireAdmin(db: Db, config: Config, accountId: string): Promise<Admin> {
  const admin = await findAdmin(db, config, accountId);
  if (!admin) throw notAdmin();
  return admin;
}

async function writeLog(db: Db, admin: Admin, action: AdminAction, targetId: string | null, note: string | null, now: Date) {
  await db.insert(adminAuditLog).values({
    adminAccountId: admin.accountId,
    adminLabel: admin.label,
    action,
    targetId,
    note,
    createdAt: now,
  });
}

// ---------- Жалобы на посты и комментарии ----------

async function loadAuthors(db: Db, profileIds: string[]): Promise<Map<string, Author>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db
    .select({ id: profiles.id, displayName: profiles.displayName, avatarMediaId: profiles.avatarMediaId, role: accounts.role })
    .from(profiles)
    .innerJoin(accounts, eq(accounts.id, profiles.accountId))
    .where(inArray(profiles.id, [...new Set(profileIds)]));
  return new Map(
    rows.map((row) => [
      row.id,
      {
        profileId: row.id,
        displayName: row.displayName,
        avatarUrl: row.avatarMediaId ? mediaPath(row.avatarMediaId) : null,
        role: row.role,
      },
    ]),
  );
}

export async function listPostReports(db: Db, status: ReportStatus, now: Date): Promise<AdminPostReportsResponse> {
  const rows = await db
    .select()
    .from(postReports)
    .where(eq(postReports.status, status))
    // Новые — в порядке поступления; разобранные — последние сверху
    .orderBy(status === 'new' ? asc(postReports.createdAt) : desc(postReports.createdAt))
    .limit(ADMIN_PAGE_SIZE);
  if (rows.length === 0) return { reports: [] };

  const postIds = rows.filter((row) => row.targetType === 'post').map((row) => row.targetId);
  const commentIds = rows.filter((row) => row.targetType === 'comment').map((row) => row.targetId);
  const targetIds = rows.map((row) => row.targetId);

  const [postRows, commentRows, photoRows, counts] = await Promise.all([
    postIds.length ? db.select().from(posts).where(inArray(posts.id, postIds)) : [],
    commentIds.length ? db.select().from(postComments).where(inArray(postComments.id, commentIds)) : [],
    postIds.length
      ? db
          .select({ postId: postPhotos.postId, mediaId: postPhotos.mediaId, width: mediaFiles.width, height: mediaFiles.height })
          .from(postPhotos)
          .innerJoin(mediaFiles, eq(mediaFiles.id, postPhotos.mediaId))
          .where(inArray(postPhotos.postId, postIds))
          .orderBy(asc(postPhotos.position))
      : [],
    db
      .select({ targetId: postReports.targetId, count: sql<number>`count(*)::int` })
      .from(postReports)
      .where(inArray(postReports.targetId, targetIds))
      .groupBy(postReports.targetId),
  ]);

  const offenderIds = rows.flatMap((row) => (row.targetAuthorProfileId ? [row.targetAuthorProfileId] : []));
  const bans = offenderIds.length
    ? await db
        .select({ profileId: profiles.id, status: accounts.status, bannedUntil: accounts.bannedUntil })
        .from(profiles)
        .innerJoin(accounts, eq(accounts.id, profiles.accountId))
        .where(inArray(profiles.id, offenderIds))
    : [];
  const bannedUntilOf = new Map(
    bans.map((row) => [row.profileId, isBanned(row, now) ? (row.bannedUntil?.toISOString() ?? null) : null]),
  );

  const authors = await loadAuthors(db, [
    ...offenderIds,
    ...rows.flatMap((row) => (row.reporterProfileId ? [row.reporterProfileId] : [])),
    ...postRows.map((row) => row.authorProfileId),
    ...commentRows.map((row) => row.authorProfileId),
  ]);
  const postsById = new Map(postRows.map((row) => [row.id, row]));
  const commentsById = new Map(commentRows.map((row) => [row.id, row]));
  const countByTarget = new Map(counts.map((row) => [row.targetId, row.count]));

  const offenderOf = (profileId: string | null) => {
    const author = profileId ? authors.get(profileId) : undefined;
    return author ? { ...author, bannedUntil: bannedUntilOf.get(author.profileId) ?? null } : null;
  };

  return {
    reports: rows.map((row) => {
      const record = row.targetType === 'post' ? postsById.get(row.targetId) : commentsById.get(row.targetId);
      const author = record ? authors.get(record.authorProfileId) : undefined;
      return {
        reportId: row.id,
        targetType: row.targetType,
        reason: row.reason,
        status: row.status,
        resolution: row.resolution,
        createdAt: row.createdAt.toISOString(),
        reporter: (row.reporterProfileId && authors.get(row.reporterProfileId)) || null,
        target:
          record && author
            ? {
                author,
                text: record.text,
                photos:
                  row.targetType === 'post'
                    ? photoRows
                        .filter((photo) => photo.postId === row.targetId)
                        .map((photo) => ({ url: mediaPath(photo.mediaId), width: photo.width, height: photo.height }))
                    : [],
                createdAt: record.createdAt.toISOString(),
              }
            : null,
        offender: offenderOf(row.targetAuthorProfileId),
        reportsOnTarget: countByTarget.get(row.targetId) ?? 1,
      };
    }),
  };
}

async function loadPostReport(db: Db, reportId: string) {
  const [report] = await db.select().from(postReports).where(eq(postReports.id, reportId));
  if (!report) throw notFound('Такой жалобы нет');
  return report;
}

// Отклонить: запись остаётся, жалоба закрывается
export async function dismissPostReport(db: Db, admin: Admin, reportId: string, now: Date): Promise<void> {
  const report = await loadPostReport(db, reportId);
  if (report.status === 'closed') return;
  await db
    .update(postReports)
    .set({ status: 'closed', resolution: 'dismissed', resolvedAt: now })
    .where(eq(postReports.id, reportId));
  await writeLog(db, admin, 'post_report_dismissed', reportId, null, now);
}

// Удалить запись, на которую пожаловались; все жалобы на неё закрываются разом
export async function removeReportedRecord(deps: AdminDeps, admin: Admin, reportId: string, now: Date): Promise<void> {
  const { db } = deps;
  const report = await loadPostReport(db, reportId);

  let removed = false;
  if (report.targetType === 'post') {
    const photos = await db.select({ mediaId: postPhotos.mediaId }).from(postPhotos).where(eq(postPhotos.postId, report.targetId));
    const deleted = await db.delete(posts).where(eq(posts.id, report.targetId)).returning({ id: posts.id });
    removed = deleted.length > 0;
    // Вместе с постом удаляются и сами файлы фото
    for (const photo of photos) await deleteMedia(deps, photo.mediaId);
  } else {
    const deleted = await db.delete(postComments).where(eq(postComments.id, report.targetId)).returning({ id: postComments.id });
    removed = deleted.length > 0;
  }

  await db
    .update(postReports)
    .set({ status: 'closed', resolution: 'removed', resolvedAt: now })
    .where(and(eq(postReports.targetType, report.targetType), eq(postReports.targetId, report.targetId), eq(postReports.status, 'new')));
  // Запись мог успеть удалить сам автор — тогда удалять нечего и в журнал писать не о чем
  if (removed) await writeLog(db, admin, report.targetType === 'post' ? 'post_removed' : 'comment_removed', report.targetId, null, now);
}

// ---------- Бан в соцсети: по профилю автора ----------

async function accountOfProfile(db: Db, profileId: string) {
  const [row] = await db
    .select({ accountId: accounts.id, emailHash: accounts.emailHash, status: accounts.status, bannedUntil: accounts.bannedUntil })
    .from(profiles)
    .innerJoin(accounts, eq(accounts.id, profiles.accountId))
    .where(eq(profiles.id, profileId));
  if (!row) throw notFound('Такого профиля нет');
  return row;
}

// Запретить человеку публиковать, лайкать и комментировать на несколько дней. Вход и просмотр остаются
export async function banAccount(db: Db, config: Config, admin: Admin, profileId: string, days: number, now: Date): Promise<void> {
  const account = await accountOfProfile(db, profileId);
  if (config.adminEmailHashes.includes(account.emailHash)) throw new ApiError(403, 'forbidden', 'Админа заблокировать нельзя');
  await db
    .update(accounts)
    .set({ status: 'banned', bannedUntil: new Date(now.getTime() + days * DAY) })
    .where(eq(accounts.id, account.accountId));
  await writeLog(db, admin, 'account_ban_set', profileId, `на ${days} дн.`, now);
}

export async function unbanAccount(db: Db, admin: Admin, profileId: string, now: Date): Promise<void> {
  const account = await accountOfProfile(db, profileId);
  const wasBanned = isBanned(account, now);
  await db.update(accounts).set({ status: 'active', bannedUntil: null }).where(eq(accounts.id, account.accountId));
  if (wasBanned) await writeLog(db, admin, 'account_ban_lifted', profileId, null, now);
}

// ---------- Жалобы из комнат: только ники ----------

async function activeBlocks(db: Db, personaIds: string[], now: Date): Promise<Map<string, Date>> {
  if (personaIds.length === 0) return new Map();
  const rows = await db
    .select({ personaId: roomSanctions.personaId, endsAt: sql<Date>`max(${roomSanctions.endsAt})`.mapWith(roomSanctions.endsAt) })
    .from(roomSanctions)
    .where(
      and(
        inArray(roomSanctions.personaId, personaIds),
        inArray(roomSanctions.type, ['room_block', 'rooms_ban']),
        gt(roomSanctions.endsAt, now),
      ),
    )
    .groupBy(roomSanctions.personaId);
  return new Map(rows.map((row) => [row.personaId, row.endsAt]));
}

export async function listRoomReports(db: Db, status: ReportStatus, now: Date): Promise<AdminRoomReportsResponse> {
  const rows = await db
    .select()
    .from(roomReports)
    .where(eq(roomReports.status, status))
    .orderBy(status === 'new' ? asc(roomReports.createdAt) : desc(roomReports.createdAt))
    .limit(ADMIN_PAGE_SIZE);
  if (rows.length === 0) return { reports: [] };

  const personaIds = [...new Set(rows.flatMap((row) => [row.reporterPersonaId, row.targetPersonaId]).filter((id): id is string => id !== null))];
  const [nicknames, blocks] = await Promise.all([
    personaIds.length ? db.select({ id: personas.id, nickname: personas.nickname }).from(personas).where(inArray(personas.id, personaIds)) : [],
    activeBlocks(db, personaIds, now),
  ]);
  const nicknameOf = new Map(nicknames.map((row) => [row.id, row.nickname]));

  return {
    reports: rows.map((row) => ({
      reportId: row.id,
      text: row.text,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reporter: row.reporterPersonaId
        ? { personaId: row.reporterPersonaId, nickname: nicknameOf.get(row.reporterPersonaId) ?? null }
        : null,
      target: row.targetPersonaId
        ? {
            personaId: row.targetPersonaId,
            nickname: nicknameOf.get(row.targetPersonaId) ?? null,
            blockedUntil: blocks.get(row.targetPersonaId)?.toISOString() ?? null,
          }
        : null,
    })),
  };
}

export async function closeRoomReport(db: Db, admin: Admin, reportId: string, now: Date): Promise<void> {
  const [report] = await db.select().from(roomReports).where(eq(roomReports.id, reportId));
  if (!report) throw notFound('Такой жалобы нет');
  if (report.status === 'closed') return;
  await db.update(roomReports).set({ status: 'closed', resolvedAt: now }).where(eq(roomReports.id, reportId));
  await writeLog(db, admin, 'room_report_closed', reportId, null, now);
}

async function requirePersona(db: Db, personaId: string): Promise<void> {
  const [persona] = await db.select({ id: personas.id }).from(personas).where(eq(personas.id, personaId));
  if (!persona) throw notFound('Такого участника нет');
}

// Закрыть человеку вход во все комнаты на несколько дней; если он сейчас в комнате — отключить
export async function banFromRooms(deps: AdminDeps, admin: Admin, personaId: string, days: number, now: Date): Promise<void> {
  const { db, voice } = deps;
  await requirePersona(db, personaId);
  await db.insert(roomSanctions).values({
    personaId,
    type: 'rooms_ban',
    roomId: null,
    source: 'admin',
    startsAt: now,
    endsAt: new Date(now.getTime() + days * DAY),
  });

  const present = await db
    .select({ roomId: rooms.id, voiceRoomName: rooms.voiceRoomName })
    .from(roomParticipations)
    .innerJoin(rooms, eq(rooms.id, roomParticipations.roomId))
    .where(and(eq(roomParticipations.personaId, personaId), isNull(roomParticipations.leftAt)));
  if (present.length > 0) {
    await db
      .update(roomParticipations)
      .set({ leftAt: now })
      .where(and(eq(roomParticipations.personaId, personaId), isNull(roomParticipations.leftAt)));
    for (const room of present) await voice?.removeParticipant(room.voiceRoomName, personaId).catch(deps.onError);
  }
  await writeLog(db, admin, 'rooms_ban_set', personaId, `на ${days} дн.`, now);
}

// Снять все действующие запреты на вход в комнаты: «выгнали», автобан и блокировку админа
export async function liftRoomsBan(db: Db, admin: Admin, personaId: string, now: Date): Promise<void> {
  await requirePersona(db, personaId);
  const lifted = await db
    .update(roomSanctions)
    .set({ endsAt: now })
    .where(
      and(eq(roomSanctions.personaId, personaId), inArray(roomSanctions.type, ['room_block', 'rooms_ban']), gt(roomSanctions.endsAt, now)),
    )
    .returning({ id: roomSanctions.id });
  if (lifted.length > 0) await writeLog(db, admin, 'rooms_ban_lifted', personaId, null, now);
}

// ---------- Журнал ----------

export async function listLog(db: Db, admin: Admin): Promise<AdminLogResponse> {
  const rows = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(ADMIN_PAGE_SIZE);
  return {
    entries: rows.map((row) => ({
      entryId: row.id,
      action: row.action,
      note: row.note,
      adminLabel: row.adminLabel,
      byMe: row.adminAccountId === admin.accountId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
