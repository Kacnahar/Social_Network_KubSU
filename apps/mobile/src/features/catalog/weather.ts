// Погода в Краснодаре. ТЕСТОВЫЕ ДАННЫЕ: настоящей погоды пока нет.
// Чтобы подключить настоящую, серверу нужен запрос, например GET /v1/weather (только для вошедших, и гостям тоже):
// ответ { city: 'Краснодар', tempC: число, kind: 'sun' | 'cloud' | 'rain' | 'snow', updatedAt: время },
// сервер сам берёт погоду у поставщика (российский или бесплатный без передачи данных пользователей —
// правило 5) и кеширует на 20–30 минут, чтобы приложение не ходило к поставщику напрямую.
export type WeatherKind = 'sun' | 'cloud' | 'rain' | 'snow';
export type Weather = { city: string; tempC: number; kind: WeatherKind };

export const TEST_WEATHER: Weather = { city: 'Краснодар', tempC: 12, kind: 'cloud' };

export function useWeather(): Weather | null {
  return TEST_WEATHER;
}

// «+12°», «−3°», «0°»
export function formatTemp(tempC: number): string {
  const value = Math.round(tempC);
  if (value > 0) return `+${value}°`;
  if (value < 0) return `−${Math.abs(value)}°`;
  return '0°';
}
