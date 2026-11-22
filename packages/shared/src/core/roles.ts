import { z } from 'zod';

export const ROLES = ['student', 'teacher', 'guest'] as const;
export type Role = (typeof ROLES)[number];
export const roleSchema = z.enum(ROLES);

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Студент',
  teacher: 'Преподаватель',
  guest: 'Гость',
};

// rooms — голосовые комнаты; publish — посты и истории; react — лайки и комментарии
export type Capability = 'rooms' | 'publish' | 'react';

// Единственное место, где записано, что кому можно: им пользуются и проверки сервера, и скрытие кнопок
const CAPABILITIES: Record<Role, readonly Capability[]> = {
  student: ['rooms', 'publish', 'react'],
  teacher: ['publish', 'react'],
  guest: [],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}
