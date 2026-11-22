import { z } from 'zod';
import { roleSchema } from './roles';

export const PROFILE_NAME_MAX = 60;
export const PROFILE_FACULTY_MAX = 100;
export const PROFILE_ABOUT_MAX = 500;
export const PROFILE_COURSE_MAX = 6;

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
});
export type Profile = z.infer<typeof profileSchema>;

export const myProfileResponseSchema = z.object({
  // null — человек ещё не заполнил профиль
  profile: profileSchema.nullable(),
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
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
