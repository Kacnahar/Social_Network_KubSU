import type { Slot } from '@app/shared';

// Расписание по дням для вкладки «Войс»: показываем ближайшую неделю

const WEEK_DAYS = 7;
const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

export type DayGroup = { key: string; label: string; slots: Slot[] };

// «Сегодня», «Завтра» или «среда, 25 ноября»
export function dayLabel(date: Date, now: Date): string {
  const days = daysBetween(now, date);
  if (days <= 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return dayFormat.format(date);
}

// «20:00» по местному времени
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Комнаты на 7 дней вперёд, сгруппированные по дням в порядке начала
export function groupSlotsByDay(slots: readonly Slot[], now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  for (const slot of sorted) {
    const startsAt = new Date(slot.startsAt);
    // Идущая комната могла начаться вчера — относим её к «Сегодня»
    const days = Math.max(0, daysBetween(now, startsAt));
    if (days >= WEEK_DAYS) continue;
    const key = String(days);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.slots.push(slot);
    else groups.push({ key, label: dayLabel(startsAt, now), slots: [slot] });
  }
  return groups;
}
