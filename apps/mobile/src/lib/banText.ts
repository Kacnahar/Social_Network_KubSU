// Тексты про бан в соцсети: даты по-русски (без React, чтобы проверять тестами)
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const banDateText = (iso: string): string => dateFormat.format(new Date(iso));

export const banDateTimeText = (iso: string): string => {
  const date = new Date(iso);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
};

// Строка под именем в профиле
export const pausedUntilText = (bannedUntil: string | null): string =>
  bannedUntil ? `Публикации на паузе до ${banDateText(bannedUntil)}` : 'Публикации на паузе';

// Основной текст экрана «Создать» у забаненного
export const pausedBodyText = (bannedUntil: string | null): string =>
  `Вам временно запрещено публиковать, лайкать и комментировать${bannedUntil ? ` до ${banDateText(bannedUntil)}` : ''}. Смотреть ленту и истории можно.`;
