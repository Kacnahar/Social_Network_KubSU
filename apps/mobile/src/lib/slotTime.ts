const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Разница в календарных днях по местному времени (а не в сутках по 24 часа)
const calendarDaysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

export function formatSlotStart(startsAt: Date, now: Date): string {
  const time = timeFormat.format(startsAt);
  const days = calendarDaysBetween(now, startsAt);
  if (days === 0) return `сегодня в ${time}`;
  if (days === 1) return `завтра в ${time}`;
  return `${dateFormat.format(startsAt)} в ${time}`;
}

function plural(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatTimeUntil(startsAt: Date, now: Date): string {
  const minutes = Math.floor((startsAt.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return 'вот-вот начнётся';
  if (minutes < 60) return `через ${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `через ${hours} ${plural(hours, 'час', 'часа', 'часов')}`;
  const days = Math.floor(hours / 24);
  return `через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}

// Сколько осталось до конца комнаты; округляем вверх, чтобы не показывать «0 мин», пока комната ещё идёт
export function formatMinutesLeft(endsAt: Date, now: Date): string {
  const minutes = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 60_000));
  return `${minutes} мин`;
}
