// Роли, которые человек выбирает сам на первом шаге регистрации
export type SignupRole = 'student' | 'teacher';

// Шаги регистрации: кто вы → анкета → код из письма
export const SIGNUP_STEPS = 3;

export function parseSignupRole(value: unknown): SignupRole | null {
  return value === 'student' || value === 'teacher' ? value : null;
}

// ВРЕМЕННЫЙ МОСТ, только для разработки. Сервер пока не умеет принимать роль: он регистрирует
// по коду приглашения, и роль задаёт код. Чтобы новый экран уже работал, при разработке вместо
// роли отправляем тестовый код этой роли. Когда сервер начнёт принимать роль (задача напарника),
// мост удалить и отправлять роль напрямую. В боевой сборке моста нет — см. inviteCodeForRole.
const DEV_INVITE_BY_ROLE: Record<SignupRole, string> = { student: 'TEST-2026', teacher: 'TEACHER-2026' };

export function inviteCodeForRole(role: SignupRole): string | null {
  return __DEV__ ? DEV_INVITE_BY_ROLE[role] : null;
}

// Анкета, заполненная до подтверждения почты. Живёт только в памяти приложения, пока идёт регистрация.
// Сервер пока принимает из неё только имя для профиля; остальные поля ждут доработки сервера
// и никуда не отправляются (см. список для бэкенда в описании задачи).
export type SignupDraft = {
  email: string;
  displayName: string;
};

let draft: SignupDraft | null = null;

export const setSignupDraft = (next: SignupDraft | null) => {
  draft = next;
};

// Анкета относится к одной почте: для другой почты её не используем
export const getSignupDraft = (email: string): SignupDraft | null => (draft && draft.email === email ? draft : null);
