import { describe, expect, it } from 'vitest';
import { contactFields, formatPhone, isPhoneComplete, messengerLink, parsePhoneInput, phoneDigitsOf, tel } from './contact';

describe('телефон в объявлении', () => {
  it('маска по мере набора', () => {
    expect(['', '9', '900', '9001', '900123', '9001234', '900123456', '9001234567'].map(formatPhone)).toEqual(['', '+7 (9', '+7 (900', '+7 (900) 1', '+7 (900) 123', '+7 (900) 123-4', '+7 (900) 123-45-6', '+7 (900) 123-45-67']);
  });

  it('разбирает набранное и вставленное', () => {
    expect(parsePhoneInput('9')).toBe('9');
    expect(parsePhoneInput('+7 (9')).toBe('9');
    expect(parsePhoneInput('+7 (')).toBe('');
    expect(parsePhoneInput('+7 (900) 123-45-67')).toBe('9001234567');
    expect(parsePhoneInput('89001234567')).toBe('9001234567');
    expect(parsePhoneInput('+7 900 123 45 67')).toBe('9001234567');
    expect(parsePhoneInput('abc')).toBe('');
    // лишняя цифра в конце не ломает номер
    expect(parsePhoneInput('+7 (900) 123-45-678')).toBe('9001234567');
    // стёрли скобку: цифры остаются
    expect(parsePhoneInput('+7 (900 1')).toBe('9001');
  });

  it('полный номер — ровно 10 цифр; неполный как будто телефона нет', () => {
    expect(isPhoneComplete('9001234567')).toBe(true);
    expect(isPhoneComplete('900123456')).toBe(false);
    expect(contactFields({ phone: '900123456', messengers: ['whatsapp'] })).toEqual({ phone: null, messengers: [] });
    expect(contactFields({ phone: '9001234567', messengers: ['telegram', 'whatsapp'] })).toEqual({ phone: '+7 (900) 123-45-67', messengers: ['whatsapp', 'telegram'] });
    expect(contactFields({ phone: '', messengers: [] })).toEqual({ phone: null, messengers: [] });
  });

  it('цифры из записанного номера и ссылки', () => {
    expect(phoneDigitsOf('+7 (900) 123-45-67')).toBe('9001234567');
    expect(phoneDigitsOf('+7 900 123-45-67')).toBe('9001234567');
    expect(phoneDigitsOf(null)).toBe('');
    expect(phoneDigitsOf('+7 900')).toBe('');
    expect(messengerLink('whatsapp', '9001234567')).toBe('https://wa.me/79001234567');
    expect(messengerLink('telegram', '9001234567')).toBe('https://t.me/+79001234567');
    expect(messengerLink('max', '9001234567')).toBeNull();
    expect(tel('9001234567')).toBe('tel:+79001234567');
  });
});
