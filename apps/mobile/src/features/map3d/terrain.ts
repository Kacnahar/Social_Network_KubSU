import { obstacleOf, isBlocked, walk, type Obstacle } from './collide';
import { campus } from './data/campus';
import model from './data/model.json';
import { boxOf, inPolygon, pointsOf } from './geo';
import type { Vec2 } from './types';

// Где можно ходить и на какой высоте стоит человек.
// Здания — преграды (внутрь можно зайти только в построенные части главного корпуса), ограда территории — край мира.

export const fence: Vec2[] = pointsOf(campus.fence);
const OPEN_PARTS = ['center', 'west', 'east', 'north'];
// Корпус Л (А4) — отдельное здание во дворе; в данных карты у него нет своей метки, поэтому узнаётся по контуру из модели
const korpLOutline = (model.korpL.outline as number[]).join(',');
const isKorpL = (building: { points: number[] }) => building.points.join(',') === korpLOutline;
const isOpen = (building: { part?: string; points: number[] }) => OPEN_PARTS.includes(building.part ?? '') || isKorpL(building);
// Западная часть корпуса: внутри можно стоять только в коридорах и холлах (кабинеты закрыты)
const westShell = campus.buildings
  .filter((building) => building.part === 'west' || building.part === 'east' || building.part === 'north' || isKorpL(building))
  .map((building) => pointsOf(building.points));
const indoor = model.indoor.map((zone) => pointsOf(zone));
// Двери кабинетов первого этажа: номер по схеме, подпись и место перед дверью
export const DOORS = model.doors;
export const obstacles: Obstacle[] = [
  // В центральный блок и западную часть главного корпуса можно войти: вместо сплошного контура их стены, колонны
  // и мебель приходят из модели отдельными преградами. Остальные здания пока закрыты целиком.
  ...campus.buildings.filter((building) => !isOpen(building)).map((building) => obstacleOf(pointsOf(building.points))),
  // стены и обстановка холла, трибуны и навесы у поля, клумбы, машины — из модели
  ...model.blocks.map((block) => obstacleOf(pointsOf(block))),
];

// Площадки выше земли: крыльцо, полы первого и второго этажей, лестничные марши. У марша высота меняется
// от height до to вдоль отрезка along — по нему человек поднимается.
type Zone = { polygon: Vec2[]; box: ReturnType<typeof boxOf>; height: number; to?: number; along?: number[] };
const raised: Zone[] = (model.raised as { points: number[]; height: number; to?: number; along?: number[] }[]).map((zone) => {
  const polygon = pointsOf(zone.points);
  return { polygon, box: boxOf(polygon), height: zone.height, to: zone.to, along: zone.along };
});

const inZone = (zone: Zone, point: Vec2) =>
  point.x >= zone.box.minX && point.x <= zone.box.maxX && point.z >= zone.box.minZ && point.z <= zone.box.maxZ && inPolygon(point, zone.polygon);

function zoneHeight(zone: Zone, point: Vec2): number {
  if (zone.to === undefined || !zone.along) return zone.height;
  const [x0, z0, x1, z1] = zone.along as [number, number, number, number];
  const dx = x1 - x0;
  const dz = z1 - z0;
  const t = Math.min(1, Math.max(0, ((point.x - x0) * dx + (point.z - z0) * dz) / (dx * dx + dz * dz)));
  return zone.height + (zone.to - zone.height) * t;
}

export const START = { position: { x: model.start.x, z: model.start.z }, yaw: model.start.yaw };
export const GROUND_LIGHT = model.groundLight;
// Место перед входом в церковь, лицом к ней
// Храм высокий — взгляд чуть вверх, чтобы глава попала в кадр
export const CHURCH_VIEW = { position: { x: model.church.x, z: model.church.z }, yaw: model.church.yaw, pitch: 0.36 };
// Место перед арт-объектом «Куб мудрости», лицом к нему
export const CUBE_VIEW = { position: { x: model.cube.x, z: model.cube.z }, yaw: model.cube.yaw };
// Сам куб: где стоит, на какой высоте нижняя вершина, длина ребра
export const CUBE_BODY = model.cube.body;
// Середина холла первого этажа, лицом к парадной лестнице
export const HALL_VIEW = { position: { x: model.hall.x, z: model.hall.z }, yaw: model.hall.yaw };
// Начало главного коридора первого этажа, лицом на запад (от холла)
export const CORRIDOR_VIEW = { position: { x: model.corridor.x, z: model.corridor.z }, yaw: model.corridor.yaw };
// Перед парадной лестницей на первом этаже и холл второго этажа, куда она выводит
export const STAIRS_VIEW = { position: { x: model.stairs.x, z: model.stairs.z }, yaw: model.stairs.yaw };
export const FLOOR2_VIEW = { position: { x: model.floor2.x, z: model.floor2.z }, yaw: model.floor2.yaw, height: model.floor2.height };
// Корпус С (восточная часть): коридор от главного холла и площадка его лестницы на первом этаже
export const EAST_VIEW = { position: { x: model.east.x, z: model.east.z }, yaw: model.east.yaw };
export const EAST_STAIRS_VIEW = { position: { x: model.eastStairs.x, z: model.eastStairs.z }, yaw: model.eastStairs.yaw };
// Холлы третьего и четвёртого этажей у парадной лестницы
const floor3 = model.floors['3'];
const floor4 = model.floors['4'];
export const FLOOR3_VIEW = { position: { x: floor3.x, z: floor3.z }, yaw: floor3.yaw, height: floor3.height };
export const FLOOR4_VIEW = { position: { x: floor4.x, z: floor4.z }, yaw: floor4.yaw, height: floor4.height };
// Корпус А (северная часть): место в коридоре второго этажа у двери в переход к нему и площадка его лестницы на первом этаже
export const NORTH_A_VIEW = { position: { x: model.northA.x, z: model.northA.z }, yaw: model.northA.yaw, height: model.northA.height };
export const NORTH_A_STAIRS_VIEW = { position: { x: model.northAStairs.x, z: model.northAStairs.z }, yaw: model.northAStairs.yaw };
// Точка на земле под переходом между корпусом А и главным корпусом
export const NORTH_A_UNDER = model.northA.under;
// Корпус Н (Центр Интернет): на улице перед его дверью, площадка его лестницы на первом этаже,
// место в коридоре дальнего западного крыла (2 этаж) у двери в переход и точка на земле под этим переходом
export const NORTH_N_VIEW = { position: { x: model.northN.x, z: model.northN.z }, yaw: model.northN.yaw };
export const NORTH_N_STAIRS_VIEW = { position: { x: model.northNStairs.x, z: model.northNStairs.z }, yaw: model.northNStairs.yaw };
export const NORTH_N_BRIDGE_VIEW = {
  position: { x: model.northNBridge.x, z: model.northNBridge.z },
  yaw: model.northNBridge.yaw,
  height: model.northNBridge.height,
};
export const NORTH_N_UNDER = model.northN.under;
// Библиотека (корпус А3): на улице перед её дверью и площадка её лестницы на первом этаже
export const NORTH_L_VIEW = { position: { x: model.northL.x, z: model.northL.z }, yaw: model.northL.yaw };
export const NORTH_L_STAIRS_VIEW = { position: { x: model.northLStairs.x, z: model.northLStairs.z }, yaw: model.northLStairs.yaw };
// Корпус Л (А4): на улице перед его дверью и площадка его лестницы на первом этаже
export const KORP_L_VIEW = { position: { x: model.korpL.x, z: model.korpL.z }, yaw: model.korpL.yaw };
export const KORP_L_STAIRS_VIEW = { position: { x: model.korpLStairs.x, z: model.korpLStairs.z }, yaw: model.korpLStairs.yaw };
// Высоты полов этажей: с первого по четвёртый — весь главный корпус, пятый есть только в северной части
export const FLOOR_LEVELS = [model.sun.y - 0.045, model.floor2.height, floor3.height, floor4.height, model.northA.levels[4]!];
// Коридор второго этажа: от холла у лестницы 3,9 м к фасаду и 16 м на запад, лицом на запад
const f2North = { x: Math.sin(model.floor2.yaw), z: -Math.cos(model.floor2.yaw) };
const f2East = { x: Math.cos(model.floor2.yaw), z: Math.sin(model.floor2.yaw) };
export const CORRIDOR2_VIEW = {
  position: { x: model.floor2.x - f2North.x * 3.9 - f2East.x * 16, z: model.floor2.z - f2North.z * 3.9 - f2East.z * 16 },
  yaw: model.floor2.yaw - Math.PI / 2,
  height: model.floor2.height,
};
// Место у кромки поля, лицом к нему
export const PITCH_VIEW = { position: { x: model.pitch.x, z: model.pitch.z }, yaw: model.pitch.yaw };
export const MODEL_VERSION = model.version;
// Пятна солнца на полу холла: высота слоя и четырёхугольники [x, z] × 4
export const SUN = model.sun;

// Интерьер в модели лежит отдельными частями. Рисовать их все сразу телефону тяжело и незачем:
// с улицы виден только холл за стеклом, с первого этажа не виден второй, сверху — ничего (мешает крыша).
// Здесь решается, какие части нужны в этой точке; с запасом, чтобы ничего не исчезало на глазах.
export const INDOOR_PARTS = [
  'indoor_hall',
  'indoor_stairs',
  'indoor_f1',
  'indoor_f2',
  'indoor_f3',
  'indoor_f4',
  'indoor_estairs',
  'indoor_e1',
  'indoor_e2',
  'indoor_e3',
  'indoor_e4',
  'indoor_astairs',
  'indoor_a1',
  'indoor_a2',
  'indoor_a3',
  'indoor_a4',
  'indoor_a5',
  'indoor_nstairs',
  'indoor_n1',
  'indoor_n2',
  'indoor_n3',
  'indoor_n4',
  'indoor_n5',
  'indoor_lstairs',
  'indoor_l1',
  'indoor_l2',
  'indoor_l3',
  'indoor_l4',
  'indoor_l5',
  'indoor_kstairs',
  'indoor_k1',
  'indoor_k2',
  'indoor_k3',
  'indoor_k4',
  'indoor_k5',
] as const;
export type IndoorPart = (typeof INDOOR_PARTS)[number];
const openShells = campus.buildings.filter(isOpen).map((building) => pointsOf(building.points));
const HALL_FAR = 150; // дальше холл за стеклом не разглядеть
const DOORS_NEAR = 45; // ближе с улицы через двери видны лестница и начало коридоров
const STAIRS_NEAR = 20; // у лестницы видны оба этажа сразу
const UPPER_FLOOR = 0.9;
const INTERNET_DOOR_NEAR = 40; // ближе с улицы через открытую дверь Центра Интернет или библиотеки виден первый этаж за ней

export function indoorParts(point: Vec2, height: number, walking: boolean): Record<IndoorPart, boolean> {
  if (!walking) return Object.fromEntries(INDOOR_PARTS.map((name) => [name, false])) as Record<IndoorPart, boolean>;
  const toHall = Math.hypot(point.x - model.hall.x, point.z - model.hall.z);
  const nearStairs = Math.hypot(point.x - model.stairs.x, point.z - model.stairs.z) < STAIRS_NEAR;
  const inside = height > UPPER_FLOOR || nearStairs || openShells.some((shell) => inPolygon(point, shell));
  const fromStreet = !inside && toHall < DOORS_NEAR;
  // корпус С: с улицы его коридоров не видно (окна глухие); у его лестницы видны все этажи
  const nearEast = Math.hypot(point.x - model.eastStairs.x, point.z - model.eastStairs.z) < 14;
  const eastFloor = (level: number) => inside && (nearEast || Math.abs(height - level) < 2.5);
  // корпус А: то же правило — свой этаж, а у его лестницы все этажи сразу
  const nearNorthA = Math.hypot(point.x - model.northAStairs.x, point.z - model.northAStairs.z) < 14;
  const northFloor = (level: number) => inside && (nearNorthA || Math.abs(height - level) < 2.5);
  // корпус Н: так же; а с улицы у его открытой двери видны первый этаж и лестница
  const toInternet = Math.hypot(point.x - model.northNStairs.x, point.z - model.northNStairs.z);
  const atInternetDoor = !inside && toInternet < INTERNET_DOOR_NEAR;
  const internetFloor = (level: number) => inside && (toInternet < 14 || Math.abs(height - level) < 2.5);
  // библиотека: так же, у неё тоже открытая дверь с улицы
  const toLibrary = Math.hypot(point.x - model.northLStairs.x, point.z - model.northLStairs.z);
  const atLibraryDoor = !inside && toLibrary < INTERNET_DOOR_NEAR;
  const libraryFloor = (level: number) => inside && (toLibrary < 14 || Math.abs(height - level) < 2.5);
  // корпус Л: так же, у него тоже открытая дверь с улицы
  const toKorpL = Math.hypot(point.x - model.korpLStairs.x, point.z - model.korpLStairs.z);
  const atKorpLDoor = !inside && Math.hypot(point.x - model.korpL.x, point.z - model.korpL.z) < 25;
  const korpLFloor = (level: number) => inside && (toKorpL < 14 || Math.abs(height - level) < 2.5);
  return {
    indoor_hall: inside || toHall < HALL_FAR,
    indoor_stairs: inside || fromStreet,
    // коридоры этажа нужны, когда человек на этом этаже; у лестницы видны все этажи сразу
    indoor_f1: fromStreet || (inside && (nearStairs || height < FLOOR_LEVELS[1]! - 0.5)),
    indoor_f2: inside && (nearStairs || Math.abs(height - FLOOR_LEVELS[1]!) < 2.5),
    indoor_f3: inside && (nearStairs || Math.abs(height - FLOOR_LEVELS[2]!) < 2.5),
    indoor_f4: inside && (nearStairs || Math.abs(height - FLOOR_LEVELS[3]!) < 2.5),
    indoor_estairs: inside,
    indoor_e1: eastFloor(FLOOR_LEVELS[0]!),
    indoor_e2: eastFloor(FLOOR_LEVELS[1]!),
    indoor_e3: eastFloor(FLOOR_LEVELS[2]!),
    indoor_e4: eastFloor(FLOOR_LEVELS[3]!),
    indoor_astairs: inside,
    indoor_a1: northFloor(FLOOR_LEVELS[0]!),
    indoor_a2: northFloor(FLOOR_LEVELS[1]!),
    indoor_a3: northFloor(FLOOR_LEVELS[2]!),
    indoor_a4: northFloor(FLOOR_LEVELS[3]!),
    indoor_a5: northFloor(FLOOR_LEVELS[4]!),
    indoor_nstairs: inside || atInternetDoor,
    indoor_n1: internetFloor(FLOOR_LEVELS[0]!) || atInternetDoor,
    indoor_n2: internetFloor(FLOOR_LEVELS[1]!),
    indoor_n3: internetFloor(FLOOR_LEVELS[2]!),
    indoor_n4: internetFloor(FLOOR_LEVELS[3]!),
    indoor_n5: internetFloor(FLOOR_LEVELS[4]!),
    indoor_lstairs: inside || atLibraryDoor,
    indoor_l1: libraryFloor(FLOOR_LEVELS[0]!) || atLibraryDoor,
    indoor_l2: libraryFloor(FLOOR_LEVELS[1]!),
    indoor_l3: libraryFloor(FLOOR_LEVELS[2]!),
    indoor_l4: libraryFloor(FLOOR_LEVELS[3]!),
    indoor_l5: libraryFloor(FLOOR_LEVELS[4]!),
    indoor_kstairs: inside || atKorpLDoor,
    indoor_k1: korpLFloor(FLOOR_LEVELS[0]!) || atKorpLDoor,
    indoor_k2: korpLFloor(FLOOR_LEVELS[1]!),
    indoor_k3: korpLFloor(FLOOR_LEVELS[2]!),
    indoor_k4: korpLFloor(FLOOR_LEVELS[3]!),
    indoor_k5: korpLFloor(FLOOR_LEVELS[4]!),
  };
}

export function canStand(point: Vec2): boolean {
  if (!inPolygon(point, fence) || isBlocked(point, obstacles)) return false;
  if (westShell.some((shell) => inPolygon(point, shell))) return indoor.some((zone) => inPolygon(point, zone));
  return true;
}

// Высота пола в точке. Этажи лежат друг над другом, поэтому из нескольких площадок берётся ближайшая
// к высоте, на которой человек стоит сейчас (near); без неё — нижняя.
export function groundHeight(point: Vec2, near = 0): number {
  let best: number | null = null;
  for (const zone of raised) {
    if (!inZone(zone, point)) continue;
    const height = zoneHeight(zone, point);
    if (best === null || Math.abs(height - near) < Math.abs(best - near)) best = height;
  }
  return best ?? 0;
}

// Выше этой высоты человек на лестнице или на верхнем этаже: там его держат не стены первого этажа, а края площадок
const UPPER = 0.9;
const REACH = 0.7; // на сколько может отличаться высота соседней площадки, чтобы на неё можно было шагнуть

// Мебель и другие предметы на верхних этажах: преграда действует только на своей высоте
const blocksUp = ((model as { blocksUp?: { points: number[]; level: number }[] }).blocksUp ?? []).map((item) => {
  const polygon = pointsOf(item.points);
  return { polygon, box: boxOf(polygon), level: item.level };
});

function onFloor(point: Vec2, height: number, radius: number): boolean {
  // человек — круг: пол нужен под всей окружностью, иначе камера подходит к стене вплотную и видит сквозь неё
  const d = radius * 0.71;
  const probes = [
    point,
    { x: point.x + radius, z: point.z },
    { x: point.x - radius, z: point.z },
    { x: point.x, z: point.z + radius },
    { x: point.x, z: point.z - radius },
    { x: point.x + d, z: point.z + d },
    { x: point.x - d, z: point.z + d },
    { x: point.x + d, z: point.z - d },
    { x: point.x - d, z: point.z - d },
  ];
  const furniture = blocksUp.filter((item) => Math.abs(item.level - height) < 1.2);
  return probes.every(
    (probe) =>
      raised.some((zone) => inZone(zone, probe) && Math.abs(zoneHeight(zone, probe) - height) < REACH) &&
      !furniture.some((item) => probe.x >= item.box.minX && probe.x <= item.box.maxX && probe.z >= item.box.minZ && probe.z <= item.box.maxZ && inPolygon(probe, item.polygon)),
  );
}

// Шаг пешехода: стены не пускают, за ограду выйти нельзя. height — на какой высоте он сейчас стоит.
export function step(from: Vec2, delta: Vec2, radius: number, height = 0): Vec2 {
  if (height > UPPER) {
    const target = { x: from.x + delta.x, z: from.z + delta.z };
    // если уже стоим вплотную к краю (после переноса или на стыке площадок), не застреваем: допускаем чуть меньший зазор
    const tight = !onFloor(from, height, radius);
    const free = (point: Vec2) => onFloor(point, height, radius) || (tight && onFloor(point, height, radius * 0.75));
    if (free(target)) return target;
    // упёрлись в край: скользим вдоль стен здания (оси берём по площадке, на которой стоим)
    const zone = raised.find((item) => inZone(item, from) && Math.abs(zoneHeight(item, from) - height) < REACH);
    if (!zone) return from;
    const [p0, p1] = [zone.polygon[0]!, zone.polygon[1]!];
    const length = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
    const axis = { x: (p1.x - p0.x) / length, z: (p1.z - p0.z) / length };
    for (const dir of [axis, { x: -axis.z, z: axis.x }]) {
      const amount = delta.x * dir.x + delta.z * dir.z;
      const slide = { x: from.x + dir.x * amount, z: from.z + dir.z * amount };
      if (Math.abs(amount) > 1e-6 && free(slide)) return slide;
    }
    return from;
  }
  const next = walk(from, delta, radius, obstacles, campus.bounds);
  return inPolygon(next, fence) ? next : from;
}
