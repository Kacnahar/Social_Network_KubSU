import type { Flat, Vec2 } from './types';

// Геометрия на плоскости земли: x — восток, z — юг, метры

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function pointsOf(flat: Flat): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) points.push({ x: flat[i]!, z: flat[i + 1]! });
  return points;
}

// Площадь со знаком: плюс и минус — два направления обхода контура
export function signedArea(polygon: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

export function centroid(polygon: readonly Vec2[]): Vec2 {
  let x = 0;
  let z = 0;
  for (const point of polygon) {
    x += point.x;
    z += point.z;
  }
  return { x: x / polygon.length, z: z / polygon.length };
}

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

export function boxOf(polygon: readonly Vec2[]): Box {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const point of polygon) {
    box.minX = Math.min(box.minX, point.x);
    box.maxX = Math.max(box.maxX, point.x);
    box.minZ = Math.min(box.minZ, point.z);
    box.maxZ = Math.max(box.maxZ, point.z);
  }
  return box;
}

export function inPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.z > point.z !== b.z > point.z && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

// Ближайшая к точке точка отрезка
export function closestOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length2 = dx * dx + dz * dz;
  const t = length2 === 0 ? 0 : clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / length2, 0, 1);
  return { x: a.x + dx * t, z: a.z + dz * t };
}

// Повторяемые «случайные» числа: одинаковые при каждом запуске, чтобы деревья не прыгали
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
