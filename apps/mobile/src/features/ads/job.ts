// Форма «Разместить вакансию»: сферы, варианты выбора и проверки. Сервера для объявлений пока нет — всё живёт в приложении.
import type { Messenger } from './contact';
import type { DistrictChoice } from './rent';

export type SalaryUnit = 'month' | 'shift' | 'hour';
export type Employment = 'full' | 'part' | 'side' | 'intern' | 'once';
export type JobSchedule = 'weekdays' | 'weekend' | 'day' | 'evening' | 'night' | 'flexible' | 'skip';
export type WorkFormat = 'office' | 'remote' | 'hybrid';
export type JobExperience = 'none' | 'under1' | 'y1to3' | 'over3';
export type Registration = 'official' | 'unofficial' | 'skip';

type Named = { value: string; label: string };
const named = (items: readonly string[]): Named[] => items.map((label, index) => ({ value: String(index), label }));

// Сферы с подсферами; у «Другого» подсфер нет — оно выбирается сразу
export const JOB_FIELDS: readonly { value: string; label: string; subs: readonly Named[] }[] = [
  { value: 'food', label: 'Общепит', subs: named(['Бариста', 'Официант', 'Повар', 'Кассир']) },
  { value: 'retail', label: 'Торговля', subs: named(['Продавец', 'Кассир', 'Мерчандайзер']) },
  { value: 'office', label: 'Офис и администрирование', subs: named(['Администратор', 'Оператор', 'Секретарь']) },
  { value: 'it', label: 'IT', subs: named(['Разработка', 'Дизайн', 'Поддержка', 'Тестирование']) },
  { value: 'education', label: 'Образование', subs: named(['Репетитор', 'Вожатый', 'Ассистент']) },
  { value: 'delivery', label: 'Курьеры и доставка', subs: named(['Пеший', 'На авто', 'На велосипеде']) },
  { value: 'promo', label: 'Промо и мероприятия', subs: named(['Промоутер', 'Хостес', 'Волонтёр']) },
  { value: 'beauty', label: 'Красота', subs: named(['Мастер', 'Администратор салона']) },
  { value: 'other', label: 'Другое', subs: [] },
];

export const SALARY_UNITS: readonly { value: SalaryUnit; label: string }[] = [
  { value: 'month', label: 'в месяц' },
  { value: 'shift', label: 'за смену' },
  { value: 'hour', label: 'в час' },
];

export const EMPLOYMENTS: readonly { value: Employment; label: string }[] = [
  { value: 'full', label: 'Полная' },
  { value: 'part', label: 'Частичная' },
  { value: 'side', label: 'Подработка' },
  { value: 'intern', label: 'Стажировка' },
  { value: 'once', label: 'Разовая' },
];

// График: три группы (между группами в окне тонкая линия); «Не указать» снимает остальные галочки и наоборот
export const SCHEDULES: readonly { value: JobSchedule; label: string; group: number }[] = [
  { value: 'weekdays', label: 'Будни', group: 0 },
  { value: 'weekend', label: 'Выходные', group: 0 },
  { value: 'day', label: 'День', group: 1 },
  { value: 'evening', label: 'Вечер', group: 1 },
  { value: 'night', label: 'Ночь', group: 1 },
  { value: 'flexible', label: 'Гибкий', group: 2 },
  { value: 'skip', label: 'Не указать', group: 2 },
];

export const WORK_FORMATS: readonly { value: WorkFormat; label: string }[] = [
  { value: 'office', label: 'В офисе' },
  { value: 'remote', label: 'Удалённо' },
  { value: 'hybrid', label: 'Гибрид' },
];

export const JOB_EXPERIENCES: readonly { value: JobExperience; label: string }[] = [
  { value: 'none', label: 'Без опыта' },
  { value: 'under1', label: 'До 1 года' },
  { value: 'y1to3', label: '1–3 года' },
  { value: 'over3', label: 'Больше 3 лет' },
];

export const REGISTRATIONS: readonly { value: Registration; label: string }[] = [
  { value: 'official', label: 'Официально' },
  { value: 'unofficial', label: 'Неофициально' },
  { value: 'skip', label: 'Не указать' },
];

export const JOB_TITLE_MAX = 60;
export const JOB_COMPANY_MAX = 60;
export const JOB_ADDRESS_MAX = 80;
export const JOB_PHOTOS_MAX = 1;

export type JobDraft = {
  photos: string[];
  position: string;
  company: string;
  field: string | null;
  subfield: string | null;
  salaryFrom: string;
  salaryTo: string;
  salaryUnit: SalaryUnit;
  salaryNegotiable: boolean;
  employment: Employment[];
  schedule: JobSchedule[];
  format: WorkFormat | null;
  address: string;
  district: DistrictChoice | null;
  experience: JobExperience | null;
  studyFriendly: boolean;
  registration: Registration | null;
  phone: string;
  messengers: Messenger[];
  description: string;
};

export type JobDetails = {
  company: string;
  field: string;
  subfield: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  // null — «По договорённости»
  salaryUnit: SalaryUnit | null;
  employment: Employment[];
  schedule: Exclude<JobSchedule, 'skip'>[];
  format: WorkFormat | null;
  address: string | null;
  district: Exclude<DistrictChoice, 'skip'> | null;
  experience: JobExperience | null;
  studyFriendly: boolean;
  registration: Exclude<Registration, 'skip'> | null;
};

export const emptyJobDraft = (): JobDraft => ({
  photos: [],
  position: '',
  company: '',
  field: null,
  subfield: null,
  salaryFrom: '',
  salaryTo: '',
  salaryUnit: 'month',
  salaryNegotiable: false,
  employment: [],
  schedule: [],
  format: null,
  address: '',
  district: null,
  experience: null,
  studyFriendly: false,
  registration: null,
  phone: '',
  messengers: [],
  description: '',
});

const num = (text: string): number | null => (text.trim() === '' ? null : Number(text));

// Зарплата задана: хотя бы одно из «от» и «до» (если оба — «от» не больше «до») или «По договорённости»
export function hasSalary(draft: Pick<JobDraft, 'salaryFrom' | 'salaryTo' | 'salaryNegotiable'>): boolean {
  if (draft.salaryNegotiable) return true;
  const from = num(draft.salaryFrom);
  const to = num(draft.salaryTo);
  if ((from === null || from <= 0) && (to === null || to <= 0)) return false;
  return from === null || to === null || from <= to;
}

// «Опубликовать» ждёт должность, компанию, сферу и зарплату; фото и остальное — по желанию
export const isJobReady = (draft: JobDraft): boolean => draft.position.trim() !== '' && draft.company.trim() !== '' && draft.field !== null && hasSalary(draft);

export const isJobTouched = (draft: JobDraft): boolean => {
  const empty = emptyJobDraft();
  return (Object.keys(empty) as (keyof JobDraft)[]).some((key) => {
    const value = draft[key];
    if (typeof value === 'string') return value.trim() !== (empty[key] as string);
    if (Array.isArray(value)) return value.length > 0;
    return value !== empty[key];
  });
};

// Адрес и район нужны, если работа не только удалённая; при «Удалённо» строки скрываем, значения не учитываем
export const showsPlace = (format: WorkFormat | null): boolean => format !== 'remote';

export function toJobDetails(draft: JobDraft): JobDetails {
  const place = showsPlace(draft.format);
  return {
    company: draft.company.trim(),
    field: draft.field as string,
    subfield: draft.subfield,
    salaryFrom: draft.salaryNegotiable ? null : num(draft.salaryFrom),
    salaryTo: draft.salaryNegotiable ? null : num(draft.salaryTo),
    salaryUnit: draft.salaryNegotiable ? null : draft.salaryUnit,
    employment: draft.employment,
    schedule: draft.schedule.filter((slot): slot is Exclude<JobSchedule, 'skip'> => slot !== 'skip'),
    format: draft.format,
    address: place && draft.address.trim() !== '' ? draft.address.trim() : null,
    district: !place || draft.district === null || draft.district === 'skip' ? null : draft.district,
    experience: draft.experience,
    studyFriendly: draft.studyFriendly,
    registration: draft.registration === null || draft.registration === 'skip' ? null : draft.registration,
  };
}

const money = (value: number) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
const UNIT_SHORT: Record<SalaryUnit, string> = { month: 'мес.', shift: 'смена', hour: 'час' };

// «от 30 000 ₽ / мес.», «до 50 000 ₽ / смена», «30 000–50 000 ₽ / час»; null — «По договорённости» или зарплаты нет
export function formatSalary(from: number | null, to: number | null, unit: SalaryUnit | null | undefined): string | null {
  if (from === null && to === null) return null;
  const range = from !== null && to !== null ? (from === to ? money(from) : `${money(from)}–${money(to)}`) : from !== null ? `от ${money(from)}` : `до ${money(to as number)}`;
  return `${range} ₽${unit ? ` / ${UNIT_SHORT[unit]}` : ''}`;
}
