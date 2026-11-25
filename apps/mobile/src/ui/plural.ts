// Русские формы числительных: 1 пост, 2 поста, 5 постов
export function plural(count: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// Имя профиля хранится одной строкой «Имя Фамилия»; для формы делим по первому пробелу
export function splitName(displayName: string): { firstName: string; lastName: string } {
  const text = displayName.trim().replace(/\s+/g, ' ');
  const space = text.indexOf(' ');
  return space === -1 ? { firstName: text, lastName: '' } : { firstName: text.slice(0, space), lastName: text.slice(space + 1) };
}

export const joinName = (firstName: string, lastName: string): string => `${firstName.trim()} ${lastName.trim()}`.trim();
