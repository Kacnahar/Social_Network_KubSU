import { z } from 'zod';
import { dateOnlySchema } from './auth';
import { roleSchema } from './roles';

export const PROFILE_NAME_MAX = 60;
export const PROFILE_FACULTY_MAX = 100;
export const PROFILE_ABOUT_MAX = 500;
export const PROFILE_COURSE_MAX = 6;
export const PROFILE_DEPARTMENT_MAX = 100;
export const PROFILE_LINKS_MAX = 3;
export const PROFILE_LINK_MAX = 200;

// Публичный никнейм соцсети (@ivan.petrov). В API он называется username, чтобы его нельзя было
// спутать с анонимным ником голосовых комнат (nickname): это разные вещи, они нигде не встречаются вместе.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const normalizeUsername = (raw: string): string => raw.trim().replace(/^@+/, '').toLowerCase();
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(z.string().regex(/^[a-z0-9._]{3,20}$/));

// Что видно другим в профиле
export const profilePrivacySchema = z.object({
  showFaculty: z.boolean(),
  showBirth: z.boolean(),
  showFriends: z.boolean(),
  showOnline: z.boolean(),
});
export type ProfilePrivacy = z.infer<typeof profilePrivacySchema>;
export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacy = { showFaculty: true, showBirth: false, showFriends: true, showOnline: true };

// Открытый профиль соцсети. Здесь никогда не бывает ника комнат и personaId.
export const profileSchema = z.object({
  profileId: z.string(),
  displayName: z.string(),
  // Путь к фото на сервере (начинается с /v1/media/) или null
  avatarUrl: z.string().nullable(),
  faculty: z.string().nullable(),
  course: z.number().int().nullable(),
  about: z.string().nullable(),
  role: roleSchema,
  username: z.string().nullable(),
  // Кафедра — только у преподавателя
  department: z.string().nullable(),
  links: z.array(z.string()),
  // Чужой профиль: только если хозяин включил «Показывать дату рождения». Свой — всегда
  birthDate: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

export const myProfileResponseSchema = z.object({
  // null — человек ещё не заполнил профиль
  profile: profileSchema.nullable(),
  // Настройки «что видно в профиле»; есть только вместе с профилем
  privacy: profilePrivacySchema.nullable(),
});
export type MyProfileResponse = z.infer<typeof myProfileResponseSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(PROFILE_NAME_MAX),
  faculty: optionalText(PROFILE_FACULTY_MAX).optional(),
  course: z.number().int().min(1).max(PROFILE_COURSE_MAX).nullable().optional(),
  about: optionalText(PROFILE_ABOUT_MAX).optional(),
  // Не передано — аватар не трогаем; null — убрать; строка — фото, загруженное через POST /v1/media
  avatarMediaId: z.uuid().nullable().optional(),
  // Не передано — не трогаем; null — убрать
  username: usernameSchema.nullable().optional(),
  department: optionalText(PROFILE_DEPARTMENT_MAX).optional(),
  links: z.array(z.url({ protocol: /^https?$/ }).max(PROFILE_LINK_MAX)).max(PROFILE_LINKS_MAX).optional(),
  birthDate: dateOnlySchema.nullable().optional(),
  privacy: profilePrivacySchema.partial().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const usernameAvailableResponseSchema = z.object({ available: z.boolean() });
export type UsernameAvailableResponse = z.infer<typeof usernameAvailableResponseSchema>;
