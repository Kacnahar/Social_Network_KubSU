import { z } from 'zod';
import { authorSchema, postPhotoSchema } from '../posts/posts';

// Админка: разбор жалоб. Жалобы соцсети показывают профили, жалобы комнат — только ники;
// профиль и ник в одном ответе не встречаются и здесь.

export const ADMIN_ROOMS_BAN_MAX_DAYS = 30;
export const ADMIN_ACCOUNT_BAN_MAX_DAYS = 30;
export const ADMIN_PAGE_SIZE = 100;

export const reportStatusSchema = z.enum(['new', 'closed']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

// ---------- Жалобы на посты и комментарии ----------

export const adminPostReportSchema = z.object({
  reportId: z.string(),
  targetType: z.enum(['post', 'comment']),
  reason: z.string(),
  status: reportStatusSchema,
  // Чем закончился разбор: запись удалена или жалоба отклонена
  resolution: z.enum(['removed', 'dismissed']).nullable(),
  createdAt: z.iso.datetime(),
  // null — пожаловавшийся удалил аккаунт
  reporter: authorSchema.nullable(),
  // null — запись уже удалена (автором или админом)
  target: z
    .object({
      author: authorSchema,
      text: z.string(),
      photos: z.array(postPhotoSchema),
      createdAt: z.iso.datetime(),
    })
    .nullable(),
  // Автор записи, на которую пожаловались: известен, даже если запись уже удалена. null — он удалил аккаунт
  offender: authorSchema
    .extend({
      // До какого времени ему запрещено публиковать, лайкать и комментировать
      bannedUntil: z.iso.datetime().nullable(),
    })
    .nullable(),
  // Сколько всего жалоб на эту запись
  reportsOnTarget: z.number().int(),
});
export type AdminPostReport = z.infer<typeof adminPostReportSchema>;

export const adminPostReportsResponseSchema = z.object({ reports: z.array(adminPostReportSchema) });
export type AdminPostReportsResponse = z.infer<typeof adminPostReportsResponseSchema>;

// Запрет публиковать, лайкать и комментировать; вход и просмотр остаются
export const adminAccountBanRequestSchema = z.object({
  days: z.number().int().min(1).max(ADMIN_ACCOUNT_BAN_MAX_DAYS),
});
export type AdminAccountBanRequest = z.infer<typeof adminAccountBanRequestSchema>;

// ---------- Жалобы из комнат ----------

const adminPersonaSchema = z.object({
  personaId: z.string(),
  // null — человек ещё не выбрал ник
  nickname: z.string().nullable(),
});

export const adminRoomReportSchema = z.object({
  reportId: z.string(),
  text: z.string(),
  status: reportStatusSchema,
  createdAt: z.iso.datetime(),
  reporter: adminPersonaSchema.nullable(),
  // null — жалоба не на человека, либо он удалил аккаунт
  target: adminPersonaSchema
    .extend({
      // До какого времени ему закрыт вход в комнаты
      blockedUntil: z.iso.datetime().nullable(),
    })
    .nullable(),
});
export type AdminRoomReport = z.infer<typeof adminRoomReportSchema>;

export const adminRoomReportsResponseSchema = z.object({ reports: z.array(adminRoomReportSchema) });
export type AdminRoomReportsResponse = z.infer<typeof adminRoomReportsResponseSchema>;

export const adminRoomsBanRequestSchema = z.object({
  days: z.number().int().min(1).max(ADMIN_ROOMS_BAN_MAX_DAYS),
});
export type AdminRoomsBanRequest = z.infer<typeof adminRoomsBanRequestSchema>;

// ---------- Журнал действий админов ----------

export const ADMIN_ACTIONS = [
  'post_removed',
  'comment_removed',
  'post_report_dismissed',
  'room_report_closed',
  'rooms_ban_set',
  'rooms_ban_lifted',
  'account_ban_set',
  'account_ban_lifted',
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  post_removed: 'Удалён пост',
  comment_removed: 'Удалён комментарий',
  post_report_dismissed: 'Жалоба на запись отклонена',
  room_report_closed: 'Жалоба из комнаты закрыта',
  rooms_ban_set: 'Закрыт вход в комнаты',
  rooms_ban_lifted: 'Вход в комнаты открыт',
  account_ban_set: 'Запрещено публиковать',
  account_ban_lifted: 'Запрет публиковать снят',
};

export const adminLogEntrySchema = z.object({
  entryId: z.string(),
  action: z.enum(ADMIN_ACTIONS),
  // Короткое пояснение: срок блокировки и т.п.
  note: z.string().nullable(),
  // «Админ 1», «Админ 2» — по порядку в настройках сервера; почта и профиль не раскрываются
  adminLabel: z.string(),
  byMe: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AdminLogEntry = z.infer<typeof adminLogEntrySchema>;

export const adminLogResponseSchema = z.object({ entries: z.array(adminLogEntrySchema) });
export type AdminLogResponse = z.infer<typeof adminLogResponseSchema>;
