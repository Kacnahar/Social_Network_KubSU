import { Platform, Share } from 'react-native';

// Копирует текст: в браузере в буфер обмена; на телефоне (библиотеки буфера в проекте нет) открывает меню «Поделиться»,
// где есть «Скопировать». Возвращает true, если скопировано сразу
export async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
    await Share.share({ message: text });
  } catch {
    // Не получилось — молча
  }
  return false;
}
