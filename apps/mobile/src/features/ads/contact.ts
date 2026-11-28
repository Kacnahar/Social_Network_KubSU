// Контакты в объявлении: телефон с маской +7 (___) ___-__-__ и мессенджеры, которые есть на этом номере.

export type Messenger = 'whatsapp' | 'telegram' | 'max';

export const MESSENGERS: readonly { value: Messenger; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
];

export const PHONE_DIGITS = 10;

// Из того, что набрали или вставили, оставляем 10 цифр номера без «+7» / «8» впереди
export function parsePhoneInput(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 0 && (text.trim().startsWith('+') || digits.length > PHONE_DIGITS) && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
  return digits.slice(0, PHONE_DIGITS);
}

// «9001234567» → «+7 (900) 123-45-67»; по мере набора: «+7 (9», «+7 (900», «+7 (900) 1» …; пусто — пусто
export function formatPhone(digits: string): string {
  if (digits === '') return '';
  let text = `+7 (${digits.slice(0, 3)}`;
  if (digits.length > 3) text += `) ${digits.slice(3, 6)}`;
  if (digits.length > 6) text += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) text += `-${digits.slice(8, 10)}`;
  return text;
}

export const isPhoneComplete = (digits: string): boolean => digits.length === PHONE_DIGITS;

// 10 цифр номера из записанного в объявлении телефона («+7 (900) 123-45-67», «+7 900 123-45-67»); пусто, если номер неполный
export function phoneDigitsOf(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
  return digits.length === PHONE_DIGITS ? digits : '';
}

// Что кладём в объявление: полный номер и отмеченные мессенджеры. Неполный номер — как будто телефона нет
export function contactFields(draft: { phone: string; messengers: readonly Messenger[] }): { phone: string | null; messengers: Messenger[] } {
  if (!isPhoneComplete(draft.phone)) return { phone: null, messengers: [] };
  return { phone: formatPhone(draft.phone), messengers: MESSENGERS.filter((item) => draft.messengers.includes(item.value)).map((item) => item.value) };
}

// Ссылка, открывающая чат с этим номером. У MAX надёжной ссылки «по номеру» нет — тогда null (номер копируем)
export function messengerLink(kind: Messenger, digits: string): string | null {
  if (kind === 'whatsapp') return `https://wa.me/7${digits}`;
  if (kind === 'telegram') return `https://t.me/+7${digits}`;
  return null;
}

export const tel = (digits: string): string => `tel:+7${digits}`;
