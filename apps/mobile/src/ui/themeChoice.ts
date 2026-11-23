// Выбор темы человеком: светлая, тёмная или «как в системе». Чистые функции без зависимостей — их проверяют автотесты
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Как в системе' },
];

export const isThemeChoice = (value: unknown): value is ThemeChoice => value === 'system' || value === 'light' || value === 'dark';

// Какая тема действует сейчас: выбор человека сильнее системной
export const resolveScheme = (choice: ThemeChoice, system: 'light' | 'dark'): 'light' | 'dark' => (choice === 'system' ? system : choice);

export const themeChoiceLabel = (choice: ThemeChoice): string => THEME_CHOICES.find((item) => item.value === choice)?.label ?? 'Как в системе';
