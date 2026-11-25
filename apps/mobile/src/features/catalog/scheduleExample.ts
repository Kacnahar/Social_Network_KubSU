// ПРИМЕР расписания пар: выдуманные группы и предметы. Настоящее расписание вуза появится,
// когда будет источник данных (сервер или файл от вуза) — сейчас его нет.

export type Lesson = { time: string; subject: string; room: string; kind: string };
export type ScheduleDay = { day: string; lessons: Lesson[] };

export const EXAMPLE_GROUPS = ['ИТ-21', 'ИТ-22', 'МФ-31', 'Ж-11'] as const;
export type ExampleGroup = (typeof EXAMPLE_GROUPS)[number];

const WEEK_A: ScheduleDay[] = [
  { day: 'Понедельник', lessons: [{ time: '08:30', subject: 'Математический анализ', room: 'Ауд. 133', kind: 'Лекция' }, { time: '10:10', subject: 'Программирование', room: 'Ауд. 207', kind: 'Практика' }] },
  { day: 'Вторник', lessons: [{ time: '10:10', subject: 'Английский язык', room: 'Ауд. 305', kind: 'Практика' }, { time: '11:50', subject: 'Физика', room: 'Ауд. 133', kind: 'Лекция' }] },
  { day: 'Среда', lessons: [{ time: '08:30', subject: 'Программирование', room: 'Ауд. 207', kind: 'Лекция' }, { time: '13:30', subject: 'Физкультура', room: 'Спорткомплекс', kind: 'Практика' }] },
  { day: 'Четверг', lessons: [{ time: '10:10', subject: 'Математический анализ', room: 'Ауд. 215', kind: 'Практика' }] },
  { day: 'Пятница', lessons: [{ time: '08:30', subject: 'Физика', room: 'Ауд. 133', kind: 'Практика' }, { time: '10:10', subject: 'История', room: 'Ауд. 401', kind: 'Лекция' }] },
  { day: 'Суббота', lessons: [] },
];

const WEEK_B: ScheduleDay[] = [
  { day: 'Понедельник', lessons: [{ time: '10:10', subject: 'Алгебра', room: 'Ауд. 215', kind: 'Лекция' }] },
  { day: 'Вторник', lessons: [{ time: '08:30', subject: 'Теория вероятностей', room: 'Ауд. 133', kind: 'Лекция' }, { time: '10:10', subject: 'Английский язык', room: 'Ауд. 305', kind: 'Практика' }] },
  { day: 'Среда', lessons: [{ time: '11:50', subject: 'Алгебра', room: 'Ауд. 215', kind: 'Практика' }] },
  { day: 'Четверг', lessons: [{ time: '08:30', subject: 'Философия', room: 'Ауд. 401', kind: 'Лекция' }, { time: '10:10', subject: 'Теория вероятностей', room: 'Ауд. 133', kind: 'Практика' }] },
  { day: 'Пятница', lessons: [{ time: '10:10', subject: 'Физкультура', room: 'Спорткомплекс', kind: 'Практика' }] },
  { day: 'Суббота', lessons: [] },
];

export const exampleWeek = (group: ExampleGroup): ScheduleDay[] => (group === 'ИТ-21' || group === 'ИТ-22' ? WEEK_A : WEEK_B);
