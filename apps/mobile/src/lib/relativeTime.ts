const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dateYearFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Разница в календарных днях по местному времени (а не в сутках по 24 часа)
const calendarDaysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

function plural(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatPostTime(createdAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - createdAt.getTime()) / 60_000);
  // Часы телефона могут отставать от сервера: «из будущего» тоже считаем «только что»
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;
  const days = calendarDaysBetween(createdAt, now);
  if (days === 0) {
    const hours = Math.floor(minutes / 60);
    return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
  }
  if (days === 1) return 'вчера';
  return (createdAt.getFullYear() === now.getFullYear() ? dateFormat : dateYearFormat).format(createdAt);
}
