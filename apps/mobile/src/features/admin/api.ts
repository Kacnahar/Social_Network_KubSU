// Модуль админки: запросы к серверу (разбор жалоб, запреты входа и публикаций, журнал)
import {
  adminLogResponseSchema,
  adminPostReportsResponseSchema,
  adminRoomReportsResponseSchema,
  okResponseSchema,
  type AdminLogEntry,
  type AdminPostReport,
  type AdminRoomReport,
  type ReportStatus,
} from '@app/shared';
import { request } from '../../lib/api';

const id = encodeURIComponent;

export const listPostReports = (token: string, status: ReportStatus): Promise<AdminPostReport[]> =>
  request(`/admin/reports/posts?status=${status}`, adminPostReportsResponseSchema, { token }).then((r) => r.reports);

export const dismissPostReport = (token: string, reportId: string) =>
  request(`/admin/reports/posts/${id(reportId)}/dismiss`, okResponseSchema, { method: 'POST', token });

export const removeReportedRecord = (token: string, reportId: string) =>
  request(`/admin/reports/posts/${id(reportId)}/remove`, okResponseSchema, { method: 'POST', token });

export const listRoomReports = (token: string, status: ReportStatus): Promise<AdminRoomReport[]> =>
  request(`/admin/reports/rooms?status=${status}`, adminRoomReportsResponseSchema, { token }).then((r) => r.reports);

export const closeRoomReport = (token: string, reportId: string) =>
  request(`/admin/reports/rooms/${id(reportId)}/close`, okResponseSchema, { method: 'POST', token });

export const banFromRooms = (token: string, personaId: string, days: number) =>
  request(`/admin/rooms/personas/${id(personaId)}/ban`, okResponseSchema, { method: 'PUT', token, body: { days } });

export const liftRoomsBan = (token: string, personaId: string) =>
  request(`/admin/rooms/personas/${id(personaId)}/ban`, okResponseSchema, { method: 'DELETE', token });

export const banAccount = (token: string, profileId: string, days: number) =>
  request(`/admin/profiles/${id(profileId)}/ban`, okResponseSchema, { method: 'PUT', token, body: { days } });

export const unbanAccount = (token: string, profileId: string) =>
  request(`/admin/profiles/${id(profileId)}/ban`, okResponseSchema, { method: 'DELETE', token });

export const listAdminLog = (token: string): Promise<AdminLogEntry[]> =>
  request('/admin/log', adminLogResponseSchema, { token }).then((r) => r.entries);
