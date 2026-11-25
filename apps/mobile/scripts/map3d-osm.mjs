// Готовит данные для 3D-карты из OpenStreetMap: контуры зданий, поле, дороги, зелень.
// Запуск из apps/mobile:  node scripts/map3d-osm.mjs [путь к сохранённому ответу Overpass]
// Без пути скрипт сам скачает данные с общедоступного сервера Overpass (бесплатно, без ключей).
// Данные © участники OpenStreetMap, лицензия ODbL — это подписано на экране карты.
import { readFile, writeFile } from 'node:fs/promises';

// Участок: главный корпус на Ставропольской, 149, двор, поле и соседние кварталы
const BOX = { south: 45.0165, west: 39.0255, north: 45.0225, east: 39.0345 };
// Начало координат мира — середина двора; x — на восток, z — на юг (север — «от нас»), всё в метрах
const ORIGIN = { lat: 45.02, lon: 39.0313 };
const M_PER_LAT = 110_540;
const M_PER_LON = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

// Четыре контура, из которых состоит главный корпус (номера объектов OpenStreetMap)
const MAIN = new Map([
  [44677834, 'center'],
  [31789177, 'west'],
  [44677835, 'east'],
  [32888061, 'north'],
]);

const QUERY = `[out:json][timeout:60];(way(${BOX.south},${BOX.west},${BOX.north},${BOX.east});relation["building"](${BOX.south},${BOX.west},${BOX.north},${BOX.east}););out body geom;`;

async function load(path) {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'campus-map-dev/0.1' },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!response.ok) throw new Error(`Overpass ответил ${response.status}`);
  return response.json();
}

const round = (value) => Math.round(value * 10) / 10;
const project = ({ lat, lon }) => [round((lon - ORIGIN.lon) * M_PER_LON), round(-(lat - ORIGIN.lat) * M_PER_LAT)];

// Замкнутый контур без повтора последней точки
function ring(geometry) {
  const points = geometry.map(project);
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points.flat();
}
const line = (geometry) => geometry.map(project).flat();
const isClosed = (geometry) =>
  geometry.length > 3 &&
  geometry[0].lat === geometry[geometry.length - 1].lat &&
  geometry[0].lon === geometry[geometry.length - 1].lon;

function levelsOf(tags) {
  const levels = Number.parseInt(tags['building:levels'] ?? '', 10);
  if (Number.isFinite(levels) && levels > 0) return Math.min(levels, 25);
  if (['garage', 'garages', 'shed', 'service', 'kiosk', 'hut', 'roof'].includes(tags.building)) return 1;
  return 2;
}

const ROAD_WIDTH = {
  primary: 16, secondary: 12, tertiary: 9, residential: 6, unclassified: 6, living_street: 5,
  service: 4, pedestrian: 5, footway: 2, path: 1.6, steps: 2, cycleway: 2, track: 3,
};

const data = await load(process.argv[2]);
const buildings = [];
const pitches = [];
const roads = [];
const greens = [];
const treeRows = [];

for (const element of data.elements) {
  const tags = element.tags ?? {};
  if (element.type === 'relation') {
    if (!tags.building) continue;
    for (const member of element.members ?? []) {
      if (member.role === 'outer' && member.geometry && isClosed(member.geometry)) {
        buildings.push({ kind: 'city', levels: levelsOf(tags), points: ring(member.geometry) });
      }
    }
    continue;
  }
  const geometry = element.geometry;
  if (element.type !== 'way' || !geometry || geometry.length < 2) continue;

  if (tags.building && isClosed(geometry)) {
    const part = MAIN.get(element.id);
    const onCampus = (tags['addr:housenumber'] ?? '').startsWith('149') && (tags['addr:street'] ?? '').includes('Ставропольская');
    buildings.push({
      kind: part ? 'main' : onCampus ? 'campus' : 'city',
      ...(part ? { part } : {}),
      levels: levelsOf(tags),
      points: ring(geometry),
    });
  } else if (tags.leisure === 'pitch' && isClosed(geometry)) {
    pitches.push({ sport: tags.sport ?? 'other', points: ring(geometry) });
  } else if (tags.highway && ROAD_WIDTH[tags.highway]) {
    roads.push({ width: ROAD_WIDTH[tags.highway], walk: ['footway', 'path', 'pedestrian', 'steps'].includes(tags.highway), points: line(geometry) });
  } else if (tags.natural === 'tree_row') {
    treeRows.push(line(geometry));
  } else if (isClosed(geometry) && (tags.landuse === 'grass' || tags.landuse === 'forest' || tags.natural === 'wood' || tags.leisure === 'park')) {
    greens.push({ trees: tags.landuse !== 'grass', points: ring(geometry) });
  }
}

// Граница территории — ограда университета из OpenStreetMap (два куска, вместе замкнутый контур)
const FENCE_WAYS = [26941237, 323849657];
const fenceParts = FENCE_WAYS.map((id) => data.elements.find((element) => element.id === id)?.geometry);
if (fenceParts.some((part) => !part)) throw new Error('В данных нет ограды территории');
const fence = ring([...fenceParts[0], ...fenceParts[1].slice(1)]);

const insideFence = (x, z) => {
  let inside = false;
  for (let i = 0, j = fence.length - 2; i < fence.length; j = i, i += 2) {
    const ax = fence[i], az = fence[i + 1], bx = fence[j], bz = fence[j + 1];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
};
const centerInside = (points) => {
  let x = 0, z = 0;
  for (let i = 0; i < points.length; i += 2) { x += points[i]; z += points[i + 1]; }
  return insideFence(x / (points.length / 2), z / (points.length / 2));
};
// От линии оставляем только куски, лежащие внутри ограды
const clipLine = (points) => {
  const pieces = [];
  let current = [];
  for (let i = 0; i < points.length; i += 2) {
    if (insideFence(points[i], points[i + 1])) current.push(points[i], points[i + 1]);
    else { if (current.length >= 4) pieces.push(current); current = []; }
  }
  if (current.length >= 4) pieces.push(current);
  return pieces;
};

// Всё, что за оградой, убираем: соседние дома, улицы, кварталы
const keep = (list) => list.filter((item) => centerInside(item.points));
const kept = {
  buildings: keep(buildings),
  pitches: keep(pitches),
  greens: keep(greens),
  roads: roads.flatMap((road) => clipLine(road.points).map((points) => ({ ...road, points }))),
  treeRows: treeRows.flatMap(clipLine),
};
// Окружение за оградой — только для вида: простые серые дома и улицы, без деталей. Ходить там нельзя
const context = {
  buildings: buildings.filter((item) => !centerInside(item.points)).map((item) => ({ levels: item.levels, points: item.points })),
  roads: roads.filter((road) => !road.walk).map((road) => ({ width: road.width, points: road.points })),
};
buildings.length = 0; buildings.push(...kept.buildings);
pitches.length = 0; pitches.push(...kept.pitches);
greens.length = 0; greens.push(...kept.greens);
roads.length = 0; roads.push(...kept.roads);
treeRows.length = 0; treeRows.push(...kept.treeRows);

const xs = fence.filter((_, i) => i % 2 === 0);
const zs = fence.filter((_, i) => i % 2 === 1);
const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };

const json = (value) => JSON.stringify(value);
const out = `// Файл создан скриптом scripts/map3d-osm.mjs — руками не править.
// Источник: © участники OpenStreetMap (лицензия ODbL). Координаты — метры от середины двора:
// x — на восток, z — на юг. Контуры записаны подряд: [x0, z0, x1, z1, …].
import type { CampusData } from '../types';

export const campus: CampusData = {
  bounds: ${json(bounds)},
  fence: ${json(fence)},
  buildings: ${json(buildings)},
  pitches: ${json(pitches)},
  roads: ${json(roads)},
  greens: ${json(greens)},
  treeRows: ${json(treeRows)},
};
`;

await writeFile(new URL('../src/features/map3d/data/campus.ts', import.meta.url), out);
// Те же данные — для скрипта Blender, который строит модель
await writeFile(new URL('./map3d/campus.json', import.meta.url), JSON.stringify({ bounds, fence, buildings, pitches, roads, greens, treeRows, context }));
console.log(`зданий ${buildings.length} (главный корпус: ${buildings.filter((b) => b.kind === 'main').length}), полей ${pitches.length}, дорог ${roads.length}, зелени ${greens.length}, рядов деревьев ${treeRows.length}`);
