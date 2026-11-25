import { campus } from './data/campus';
import model from './data/model.json';
import { inPolygon, pointsOf } from './geo';
import { FLOOR_LEVELS } from './terrain';
import type { Vec2 } from './types';

// «Где я»: название места по точке и высоте, на которой стоит человек, и какая схема нужна для мини-карты.

export type Place = { floor: number | null; title: string; label: string; map: MiniMap };
export type MiniMap = { file: string; box: number[]; width: number; height: number };

type Indoor = { floor: number | null; title: string; level: number | null; polygon: Vec2[] };
const indoor: Indoor[] = (model.places as { floor: number | null; title: string; level: number | null; points: number[] }[]).map((place) => ({
  floor: place.floor,
  title: place.title,
  level: place.level,
  polygon: pointsOf(place.points),
}));
const pitches = campus.pitches.map((pitch) => pointsOf(pitch.points));
const maps = model.minimap as Record<string, MiniMap>;

const near = (point: Vec2, spot: { x: number; z: number }, radius: number) => Math.hypot(point.x - spot.x, point.z - spot.z) < radius;

export function placeAt(point: Vec2, height: number): Place {
  // сначала места с известным этажом (они лежат друг над другом), потом лестница — она общая для этажей
  const inside = indoor.filter((place) => inPolygon(point, place.polygon));
  const exact = inside.find((place) => place.level !== null && Math.abs(place.level - height) < 1.2);
  const found = exact ?? inside.find((place) => place.level === null && height > 0.3);
  if (found) {
    // на лестнице этаж — тот, чей пол ближе по высоте
    const floor = found.floor ?? FLOOR_LEVELS.reduce((best, level, index) => (Math.abs(level - height) < Math.abs(FLOOR_LEVELS[best]! - height) ? index : best), 0) + 1;
    return { floor, title: found.title, label: `Этаж ${floor} · ${found.title}`, map: maps[`f${floor}`]! };
  }
  let title = 'Двор';
  if (pitches.some((pitch) => inPolygon(point, pitch))) title = 'Футбольное поле';
  else if (near(point, model.cube.body, 16)) title = 'Куб мудрости';
  else if (near(point, model.church, 30)) title = 'У храма';
  else if (near(point, model.entrance, 22)) title = 'Главный вход';
  return { floor: null, title, label: `Улица · ${title}`, map: maps.out! };
}

// Точка в метрах -> доля ширины и высоты схемы (0..1)
export function onMiniMap(map: MiniMap, point: Vec2): { x: number; y: number } {
  const [minX, maxX, minZ, maxZ] = map.box as [number, number, number, number];
  return { x: (point.x - minX) / (maxX - minX), y: (point.z - minZ) / (maxZ - minZ) };
}
