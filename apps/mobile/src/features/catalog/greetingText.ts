// Приветствие по времени суток: утро 5–12, день 12–17, вечер 17–23, ночь 23–5
export function greetingFor(now: Date, firstName: string | null): string {
  const hour = now.getHours();
  const [named, plain] =
    hour >= 5 && hour < 12
      ? ['Доброе утро', 'Доброе утро']
      : hour >= 12 && hour < 17
        ? ['Добрый день', 'Добрый день']
        : hour >= 17 && hour < 23
          ? ['Добрый вечер', 'Добрый вечер']
          : ['Доброй ночи', 'Доброй ночи'];
  return firstName ? `${named}, ${firstName}` : plain;
}

// Имя для приветствия: первое слово из «Имя Фамилия»; у гостя имени нет
export function firstNameOf(displayName: string | null | undefined, isGuest: boolean): string | null {
  if (isGuest) return null;
  return displayName?.trim().split(/\s+/)[0] || null;
}
