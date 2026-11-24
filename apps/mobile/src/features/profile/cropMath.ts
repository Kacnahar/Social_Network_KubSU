// Математика обрезки фото профиля. Круглая рамка диаметром D стоит по центру; фото лежит под ней.
// zoom = 1 — фото в самом «тесном» виде, когда оно ровно закрывает круг; больше 1 — приближено.

export const MAX_ZOOM = 5;
export const OUTPUT_MAX = 1024;

export type Offset = { x: number; y: number };

// Размер фото на экране при zoom = 1: меньшая сторона равна диаметру рамки
export const baseScale = (width: number, height: number, diameter: number): number => diameter / Math.min(width, height);

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(1, zoom));

// Насколько фото можно сдвинуть от центра, чтобы в круге не осталось пустоты
export function maxOffset(width: number, height: number, diameter: number, zoom: number): Offset {
  const scale = baseScale(width, height, diameter) * zoom;
  return { x: Math.max(0, (width * scale - diameter) / 2), y: Math.max(0, (height * scale - diameter) / 2) };
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value)) || 0;

export function clampOffset(offset: Offset, width: number, height: number, diameter: number, zoom: number): Offset {
  const limit = maxOffset(width, height, diameter, zoom);
  return { x: clamp(offset.x, limit.x), y: clamp(offset.y, limit.y) };
}

// «Резинка»: за границей фото сдвигается только на часть пальца (чем дальше, тем туже)
export function rubberBand(value: number, limit: number, resistance = 0.35): number {
  if (Math.abs(value) <= limit) return value;
  const over = Math.abs(value) - limit;
  return Math.sign(value) * (limit + over * resistance);
}

// Какой квадрат исходной картинки (в её пикселях) виден в круге. width/height — размеры фото после поворота
export function cropRect(width: number, height: number, diameter: number, zoom: number, offset: Offset): { originX: number; originY: number; size: number } {
  const scale = baseScale(width, height, diameter) * zoom;
  const size = diameter / scale;
  const cx = width / 2 - offset.x / scale;
  const cy = height / 2 - offset.y / scale;
  const originX = Math.min(Math.max(0, cx - size / 2), width - size);
  const originY = Math.min(Math.max(0, cy - size / 2), height - size);
  return { originX: Math.round(originX), originY: Math.round(originY), size: Math.round(size) };
}

// Размер готового квадрата: не больше 1024 и не больше того, что есть в фото
export const outputSize = (cropSize: number): number => Math.max(1, Math.min(OUTPUT_MAX, Math.round(cropSize)));
