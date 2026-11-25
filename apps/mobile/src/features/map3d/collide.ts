import { boxOf, closestOnSegment, inPolygon, type Box } from './geo';
import type { Vec2 } from './types';

// Преграда для пешехода: замкнутый контур, внутрь которого нельзя (здание снаружи)
export type Obstacle = { polygon: Vec2[]; box: Box };

export const obstacleOf = (polygon: Vec2[]): Obstacle => ({ polygon, box: boxOf(polygon) });

const near = (point: Vec2, box: Box, margin: number) =>
  point.x > box.minX - margin && point.x < box.maxX + margin && point.z > box.minZ - margin && point.z < box.maxZ + margin;

export function isBlocked(point: Vec2, obstacles: readonly Obstacle[]): boolean {
  return obstacles.some((obstacle) => near(point, obstacle.box, 0) && inPolygon(point, obstacle.polygon));
}

// Шаг пешехода: идём, куда просили, а от стен отталкиваемся — получается скольжение вдоль стены.
// Человек — круг радиуса radius. Длинный шаг делим на короткие, чтобы не проскочить стену насквозь.
export function walk(from: Vec2, step: Vec2, radius: number, obstacles: readonly Obstacle[], bounds: Box): Vec2 {
  const length = Math.hypot(step.x, step.z);
  const parts = Math.max(1, Math.ceil(length / (radius * 0.5)));
  let position = from;
  for (let part = 0; part < parts; part += 1) {
    let next = { x: position.x + step.x / parts, z: position.z + step.z / parts };
    for (let pass = 0; pass < 3; pass += 1) {
      for (const obstacle of obstacles) {
        if (!near(next, obstacle.box, radius)) continue;
        const polygon = obstacle.polygon;
        for (let i = 0; i < polygon.length; i += 1) {
          const closest = closestOnSegment(next, polygon[i]!, polygon[(i + 1) % polygon.length]!);
          const dx = next.x - closest.x;
          const dz = next.z - closest.z;
          const distance = Math.hypot(dx, dz);
          if (distance >= radius || distance === 0) continue;
          const push = (radius - distance) / distance;
          next = { x: next.x + dx * push, z: next.z + dz * push };
        }
      }
    }
    next = {
      x: Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, next.x)),
      z: Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, next.z)),
    };
    // Если всё же оказались внутри преграды (острый угол), этот кусок шага не делаем
    if (isBlocked(next, obstacles)) break;
    position = next;
  }
  return position;
}
