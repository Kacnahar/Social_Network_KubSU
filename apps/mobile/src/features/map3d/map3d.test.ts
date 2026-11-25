import { describe, expect, it } from 'vitest';
import { isBlocked, obstacleOf, walk } from './collide';
import { BODY_RADIUS, FOV, createControls } from './controls';
import { campus } from './data/campus';
import { createGestures } from './gestures';
import { inPolygon, pointsOf, signedArea } from './geo';
import { ORBIT_LIMITS, clampOrbit, orbitEye, panOrbit } from './orbit';
import model from './data/model.json';
import { onMiniMap, placeAt } from './places';
import {
  CHURCH_VIEW,
  CORRIDOR2_VIEW,
  CORRIDOR_VIEW,
  CUBE_VIEW,
  DOORS,
  EAST_STAIRS_VIEW,
  EAST_VIEW,
  FLOOR2_VIEW,
  FLOOR3_VIEW,
  FLOOR4_VIEW,
  FLOOR_LEVELS,
  HALL_VIEW,
  KORP_L_STAIRS_VIEW,
  KORP_L_VIEW,
  NORTH_A_STAIRS_VIEW,
  NORTH_A_UNDER,
  NORTH_A_VIEW,
  NORTH_L_STAIRS_VIEW,
  NORTH_L_VIEW,
  NORTH_N_BRIDGE_VIEW,
  NORTH_N_STAIRS_VIEW,
  NORTH_N_UNDER,
  NORTH_N_VIEW,
  STAIRS_VIEW,
  PITCH_VIEW,
  START,
  canStand,
  fence,
  groundHeight,
  indoorParts,
  obstacles,
  step,
} from './terrain';

const square = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 10 },
  { x: 0, z: 10 },
];
const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

describe('геометрия', () => {
  it('разбирает контур из чисел подряд', () => {
    expect(pointsOf([1, 2, 3, 4])).toEqual([
      { x: 1, z: 2 },
      { x: 3, z: 4 },
    ]);
  });

  it('считает площадь и понимает, внутри ли точка', () => {
    expect(Math.abs(signedArea(square))).toBe(100);
    expect(inPolygon({ x: 5, z: 5 }, square)).toBe(true);
    expect(inPolygon({ x: 15, z: 5 }, square)).toBe(false);
  });
});

describe('ходьба', () => {
  const obstacles = [obstacleOf(square)];

  it('по открытому месту идёт свободно', () => {
    const end = walk({ x: -20, z: 5 }, { x: 3, z: 0 }, BODY_RADIUS, obstacles, bounds);
    expect(end.x).toBeCloseTo(-17, 6);
    expect(end.z).toBeCloseTo(5, 6);
  });

  it('не проходит сквозь стену, даже одним длинным шагом', () => {
    const end = walk({ x: -5, z: 5 }, { x: 30, z: 0 }, BODY_RADIUS, obstacles, bounds);
    expect(end.x).toBeLessThanOrEqual(-BODY_RADIUS + 0.01);
    expect(isBlocked(end, obstacles)).toBe(false);
  });

  it('скользит вдоль стены, если идти в неё под углом', () => {
    const end = walk({ x: -1, z: 2 }, { x: 2, z: 2 }, BODY_RADIUS, obstacles, bounds);
    expect(end.x).toBeLessThan(0);
    expect(end.z).toBeGreaterThan(3.5);
  });

  it('не выходит за край мира', () => {
    const end = walk({ x: 95, z: 50 }, { x: 50, z: 0 }, BODY_RADIUS, [], bounds);
    expect(end.x).toBeLessThanOrEqual(100 - BODY_RADIUS);
  });
});

describe('данные участка', () => {
  it('главный корпус состоит из четырёх частей, поле на месте', () => {
    const main = campus.buildings.filter((building) => building.kind === 'main');
    expect(main.map((building) => building.part).sort()).toEqual(['center', 'east', 'north', 'west']);
    expect(campus.pitches.some((pitch) => pitch.sport === 'soccer')).toBe(true);
  });

  it('стартовая точка — на улице внутри территории', () => {
    expect(canStand(START.position)).toBe(true);
  });

  it('за оградой ничего нет: все здания и поля — внутри территории', () => {
    for (const item of [...campus.buildings, ...campus.pitches]) {
      const points = pointsOf(item.points);
      const center = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, z: points.reduce((sum, p) => sum + p.z, 0) / points.length };
      expect(inPolygon(center, fence)).toBe(true);
    }
  });

  it('за ограду выйти нельзя', () => {
    let position = START.position;
    for (let i = 0; i < 400; i += 1) position = step(position, { x: 0, z: 1 }, BODY_RADIUS);
    expect(inPolygon(position, fence)).toBe(true);
    expect(position.z).toBeLessThan(140);
  });

  it('на крыльце главного входа человек стоит выше, чем на площади', () => {
    expect(groundHeight(START.position)).toBe(0);
    expect(groundHeight({ x: -18, z: 53.5 })).toBeGreaterThan(0.3);
  });

  it('у поля можно стоять, по полю можно ходить, а сквозь трибуны — нельзя', () => {
    expect(canStand(PITCH_VIEW.position)).toBe(true);
    expect(canStand(CHURCH_VIEW.position)).toBe(true);
    expect(canStand(CUBE_VIEW.position)).toBe(true);
    expect(canStand(HALL_VIEW.position)).toBe(true);
    const pitch = pointsOf(campus.pitches.find((item) => item.sport === 'soccer')!.points);
    const middle = { x: pitch.reduce((sum, p) => sum + p.x, 0) / 4, z: pitch.reduce((sum, p) => sum + p.z, 0) / 4 };
    expect(canStand(middle)).toBe(true);
    // трибуна — самая длинная из преград, добавленных моделью
    const extra = obstacles.slice(campus.buildings.length).map((item) => item.polygon);
    const span = (polygon: typeof fence) => Math.hypot(polygon[2]!.x - polygon[0]!.x, polygon[2]!.z - polygon[0]!.z);
    const stand = extra.reduce((best, polygon) => (span(polygon) > span(best) ? polygon : best));
    const inStand = { x: stand.reduce((sum, p) => sum + p.x, 0) / stand.length, z: stand.reduce((sum, p) => sum + p.z, 0) / stand.length };
    expect(canStand(inStand)).toBe(false);
  });

  it('в холл главного корпуса входят через дверь, а сквозь витраж рядом — нет', () => {
    const door = { x: model.entrance.x, z: model.entrance.z };
    const hall = HALL_VIEW.position;
    const length = Math.hypot(hall.x - door.x, hall.z - door.z);
    const inward = { x: (hall.x - door.x) / length, z: (hall.z - door.z) / length };
    const along = { x: -inward.z, z: inward.x };
    const walkIn = (from: { x: number; z: number }) => {
      let position = from;
      for (let i = 0; i < 80; i += 1) position = step(position, { x: inward.x * 0.25, z: inward.z * 0.25 }, 0.4);
      return (position.x - door.x) * inward.x + (position.z - door.z) * inward.z;
    };
    // от точки перед дверью проходим внутрь: дальше фасада (8 м) и тамбура
    expect(walkIn(door)).toBeGreaterThan(12);
    // в шести метрах сбоку — сплошной витраж: упираемся в фасад
    expect(walkIn({ x: door.x + along.x * 6, z: door.z + along.z * 6 })).toBeLessThan(8);
    // в холле пол на высоте крыльца
    expect(groundHeight(hall)).toBeCloseTo(0.45, 2);
  });

  it('из холла по коридору первого этажа доходят до дальнего крыла, а в кабинеты не попадают', () => {
    const start = CORRIDOR_VIEW.position;
    expect(canStand(start)).toBe(true);
    expect(groundHeight(start)).toBeCloseTo(0.45, 2);
    // идём на запад вдоль коридора
    const west = { x: Math.sin(CORRIDOR_VIEW.yaw), z: -Math.cos(CORRIDOR_VIEW.yaw) };
    let position = start;
    for (let i = 0; i < 400; i += 1) position = step(position, { x: west.x * 0.25, z: west.z * 0.25 }, 0.35);
    expect(Math.hypot(position.x - start.x, position.z - start.z)).toBeGreaterThan(85);
    // из холла в коридор проходят через проём
    const hall = HALL_VIEW.position;
    expect(canStand({ x: (start.x + hall.x) / 2, z: start.z })).toBeDefined();
    // вбок от коридора — стена кабинета: дальше полутора метров не уйти
    const side = { x: -west.z, z: west.x };
    for (const sign of [1, -1]) {
      let aside = start;
      for (let i = 0; i < 40; i += 1) aside = step(aside, { x: side.x * 0.25 * sign, z: side.z * 0.25 * sign }, 0.35);
      expect(Math.hypot(aside.x - start.x, aside.z - start.z)).toBeLessThan(1.5);
    }
    // перед каждой дверью можно стоять, и все двери пронумерованы подряд
    const first = DOORS.filter((door) => door.floor === 1 && door.wing === 'main');
    expect(first.length).toBeGreaterThan(50);
    first.forEach((door, index) => {
      expect(door.n).toBe(index + 1);
      expect(canStand({ x: door.x, z: door.z })).toBe(true);
    });
    // внутри кабинета стоять нельзя (точка в четырёх метрах за стеной коридора)
    expect(canStand({ x: start.x + side.x * 5, z: start.z + side.z * 5 })).toBe(false);
    expect(canStand({ x: start.x - side.x * 5, z: start.z - side.z * 5 })).toBe(false);
  });

  it('по парадной лестнице поднимаются на второй этаж и не падают с площадки', () => {
    const yaw = STAIRS_VIEW.yaw;
    const north = { x: Math.sin(yaw), z: -Math.cos(yaw) };
    const east = { x: Math.cos(yaw), z: Math.sin(yaw) };
    let position = STAIRS_VIEW.position;
    let height = groundHeight(position, 0);
    expect(height).toBeCloseTo(0.45, 2);
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        position = step(position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, height);
        height = groundHeight(position, height);
      }
    };
    go(north, 14); // по проходу и среднему маршу до промежуточной площадки
    const middle = (0.45 + FLOOR2_VIEW.height) / 2;
    expect(height).toBeCloseTo(middle, 1);
    go(east, 5); // по площадке к боковому маршу
    expect(height).toBeCloseTo(middle, 1);
    go({ x: -north.x, z: -north.z }, 9); // по боковому маршу вверх и в холл второго этажа
    expect(height).toBeCloseTo(FLOOR2_VIEW.height, 2);
    // со второго этажа тем же путём поднимаются на третий
    position = FLOOR2_VIEW.position;
    height = groundHeight(position, FLOOR2_VIEW.height);
    expect(height).toBeCloseTo(FLOOR2_VIEW.height, 2);
    go(north, 12);
    const middle3 = (FLOOR2_VIEW.height + FLOOR3_VIEW.height) / 2;
    expect(height).toBeCloseTo(middle3, 1);
    go(east, 5);
    expect(height).toBeCloseTo(middle3, 1);
    go({ x: -north.x, z: -north.z }, 9);
    expect(height).toBeCloseTo(FLOOR3_VIEW.height, 2);
    // и с третьего на четвёртый
    position = FLOOR3_VIEW.position;
    height = FLOOR3_VIEW.height;
    go(north, 12);
    go(east, 5);
    expect(height).toBeCloseTo((FLOOR3_VIEW.height + FLOOR4_VIEW.height) / 2, 1);
    go({ x: -north.x, z: -north.z }, 9);
    expect(height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    // на четвёртом (верхнем) этаже: с площадки над средним маршем вниз не шагнуть
    position = FLOOR4_VIEW.position;
    height = groundHeight(position, FLOOR4_VIEW.height);
    expect(height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    go(north, 12);
    expect(height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    const walked = (position.x - FLOOR4_VIEW.position.x) * north.x + (position.z - FLOOR4_VIEW.position.z) * north.z;
    expect(walked).toBeLessThan(6);
    // четвёртый этаж: из актового зала через дверь в перегородке — в фойе, оттуда через переход по коридору на запад до конца
    position = FLOOR4_VIEW.position;
    height = FLOOR4_VIEW.height;
    go({ x: -north.x, z: -north.z }, 5.65);
    go({ x: -east.x, z: -east.z }, 21);
    expect(placeAt(position, height).label).toBe('Этаж 4 · Фойе актового зала');
    go(north, 1.9);
    go({ x: -east.x, z: -east.z }, 130);
    expect(Math.hypot(position.x - FLOOR4_VIEW.position.x, position.z - FLOOR4_VIEW.position.z)).toBeGreaterThan(110);
    expect(height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    const fourth = DOORS.filter((door) => door.floor === 4);
    expect(fourth.length).toBeGreaterThan(30);
    fourth.forEach((door) => expect(groundHeight({ x: door.x, z: door.z }, FLOOR4_VIEW.height)).toBeCloseTo(FLOOR4_VIEW.height, 2));
    expect(placeAt(FLOOR4_VIEW.position, FLOOR4_VIEW.height).label).toBe('Этаж 4 · Холл у актового зала');
    // из холла третьего этажа — через узкий переход по коридору на запад до конца
    position = FLOOR3_VIEW.position;
    height = FLOOR3_VIEW.height;
    go({ x: -north.x, z: -north.z }, 3.6); // по середине коридора: у стены стоит скамейка
    const from3 = position;
    go({ x: -east.x, z: -east.z }, 130);
    expect(Math.hypot(position.x - from3.x, position.z - from3.z)).toBeGreaterThan(100);
    expect(height).toBeCloseTo(FLOOR3_VIEW.height, 2);
    const third = DOORS.filter((door) => door.floor === 3);
    expect(third.length).toBeGreaterThan(50);
    third.forEach((door) => expect(groundHeight({ x: door.x, z: door.z }, FLOOR3_VIEW.height)).toBeCloseTo(FLOOR3_VIEW.height, 2));
    expect(third.find((door) => door.label === 'Спортзал')).toBeDefined();
    // из холла второго этажа уходят по коридору на запад до дальнего крыла, высота не меняется
    position = FLOOR2_VIEW.position;
    height = FLOOR2_VIEW.height;
    go({ x: -north.x, z: -north.z }, 3.9);
    const from = position;
    go({ x: -east.x, z: -east.z }, 130);
    expect(Math.hypot(position.x - from.x, position.z - from.z)).toBeGreaterThan(100);
    expect(height).toBeCloseTo(FLOOR2_VIEW.height, 2);
    expect(groundHeight(CORRIDOR2_VIEW.position, CORRIDOR2_VIEW.height)).toBeCloseTo(FLOOR2_VIEW.height, 2);
    // перед каждой дверью второго этажа есть пол этого этажа
    const second = DOORS.filter((door) => door.floor === 2);
    expect(second.length).toBeGreaterThan(50);
    second.forEach((door) => expect(groundHeight({ x: door.x, z: door.z }, FLOOR2_VIEW.height)).toBeCloseTo(FLOOR2_VIEW.height, 2));
    // а на первом этаже под этим холлом по-прежнему пол первого этажа
    expect(groundHeight(FLOOR2_VIEW.position, 0.45)).toBeCloseTo(0.45, 2);
  });

  it('подсказка «где я» называет место и этаж, а точка попадает на мини-карту', () => {
    expect(placeAt(START.position, 0).label).toMatch(/^Улица · /);
    expect(placeAt(PITCH_VIEW.position, 0).floor).toBeNull();
    expect(placeAt(HALL_VIEW.position, 0.45).label).toBe('Этаж 1 · Холл');
    expect(placeAt(CORRIDOR_VIEW.position, 0.45).label).toBe('Этаж 1 · Главный коридор');
    expect(placeAt(STAIRS_VIEW.position, 0.45).label).toBe('Этаж 1 · Проход к лестнице');
    // холл второго этажа лежит над проходом первого: этаж различается по высоте
    expect(placeAt(FLOOR2_VIEW.position, FLOOR2_VIEW.height).label).toBe('Этаж 2 · Холл у лестницы');
    expect(placeAt(CORRIDOR2_VIEW.position, CORRIDOR2_VIEW.height).label).toBe('Этаж 2 · Центральный коридор');
    for (const [view, height] of [[START, 0], [HALL_VIEW, 0.45], [CORRIDOR2_VIEW, CORRIDOR2_VIEW.height]] as const) {
      const place = placeAt(view.position, height);
      const spot = onMiniMap(place.map, view.position);
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.x).toBeLessThan(1);
      expect(spot.y).toBeGreaterThan(0);
      expect(spot.y).toBeLessThan(1);
    }
  });

  it('в данных нет названия вуза', () => {
    expect(JSON.stringify(campus)).not.toMatch(/кубгу|kubsu|кубанск/i);
  });
});

describe('камера сверху', () => {
  const orbit = { x: 0, z: 0, distance: 100, azimuth: 0, tilt: 0 };

  it('строго сверху камера висит над точкой', () => {
    expect(orbitEye(orbit)).toEqual({ x: 0, y: 100, z: 0 });
  });

  it('при наклоне камера отходит на юг, если смотрим на север', () => {
    const eye = orbitEye({ ...orbit, tilt: Math.PI / 4 });
    expect(eye.z).toBeGreaterThan(0);
    expect(eye.y).toBeCloseTo(70.71, 1);
  });

  it('карта едет за пальцем: палец вправо — смотрим западнее, палец вниз — севернее', () => {
    expect(panOrbit(orbit, 50, 0, 800, FOV).x).toBeLessThan(0);
    expect(panOrbit(orbit, 0, 50, 800, FOV).z).toBeLessThan(0);
  });

  it('не даёт улететь слишком далеко, близко или под землю', () => {
    const clamped = clampOrbit({ x: 9999, z: -9999, distance: 5, azimuth: 0, tilt: 3 }, bounds);
    expect(clamped).toMatchObject({ x: 100, z: -100, distance: ORBIT_LIMITS.minDistance, tilt: ORBIT_LIMITS.maxTilt });
  });
});

describe('жесты', () => {
  const view = { width: 400, height: 800 };
  const setup = () => {
    const controls = createControls();
    const taps: [number, number][] = [];
    const gestures = createGestures(controls, { onStick: () => {}, onTap: (x, y) => taps.push([x, y]) });
    return { controls, gestures, taps };
  };
  const finger = (identifier: number, pageX: number, pageY: number) => ({ identifier, pageX, pageY });

  it('в прогулке левый палец — джойстик, правый — поворот головы, одновременно', () => {
    const { controls, gestures } = setup();
    const yaw = controls.yaw;
    gestures.handle([finger(1, 80, 600)], view, 0);
    gestures.handle([finger(1, 80, 600), finger(2, 300, 400)], view, 10);
    gestures.handle([finger(1, 80, 500), finger(2, 340, 400)], view, 20);
    expect(controls.stick.y).toBe(-1);
    expect(controls.yaw).toBeGreaterThan(yaw);
    gestures.handle([finger(2, 340, 400)], view, 30);
    expect(controls.stick).toEqual({ x: 0, y: 0 });
  });

  it('сверху щипок приближает, а короткое касание — это нажатие', () => {
    const { controls, gestures, taps } = setup();
    controls.mode = 'top';
    const distance = controls.orbit.distance;
    gestures.handle([finger(1, 150, 400), finger(2, 250, 400)], view, 0);
    gestures.handle([finger(1, 100, 400), finger(2, 300, 400)], view, 16);
    gestures.handle([], view, 32);
    expect(controls.orbit.distance).toBeCloseTo(distance / 2, 5);
    expect(taps).toEqual([]);

    gestures.handle([finger(3, 200, 300)], view, 1000);
    gestures.handle([], view, 1100);
    expect(taps).toEqual([[200, 300]]);
  });

  it('сверху два пальца вверх наклоняют камеру, поворот пары поворачивает карту', () => {
    const { controls, gestures } = setup();
    controls.mode = 'top';
    controls.orbit = { ...controls.orbit, tilt: 0.3, azimuth: 0 };
    gestures.handle([finger(1, 150, 400), finger(2, 250, 400)], view, 0);
    gestures.handle([finger(1, 150, 350), finger(2, 250, 350)], view, 16);
    expect(controls.orbit.tilt).toBeGreaterThan(0.3);
    gestures.handle([finger(1, 150, 300), finger(2, 250, 400)], view, 32);
    expect(controls.orbit.azimuth).not.toBe(0);
  });
});

describe('что из интерьера рисуется', () => {
  it('сверху интерьер не рисуется совсем', () => {
    expect(Object.values(indoorParts(HALL_VIEW.position, 0.45, false)).some(Boolean)).toBe(false);
  });

  it('далеко на улице интерьер спрятан, у входа виден холл с лестницей, но не второй этаж', () => {
    // куб стоит рядом с открытой дверью Центра Интернет: оттуда виден только его первый этаж с лестницей
    const atCube = indoorParts(CUBE_VIEW.position, 0, true);
    const shownAtCube = Object.entries(atCube).filter(([, on]) => on).map(([name]) => name).sort();
    expect(shownAtCube).toEqual(['indoor_n1', 'indoor_nstairs']);
    // а совсем далеко от дверей не рисуется ничего
    const farAway = { x: CUBE_VIEW.position.x, z: CUBE_VIEW.position.z - 60 };
    expect(Object.values(indoorParts(farAway, 0, true)).some(Boolean)).toBe(false);
    const atDoor = indoorParts(START.position, 0, true);
    expect(atDoor.indoor_hall).toBe(true);
    expect(atDoor.indoor_f2).toBe(false);
  });

  it('в коридоре первого этажа второй этаж спрятан, в коридоре второго — первый; у лестницы видно всё', () => {
    const first = indoorParts(CORRIDOR_VIEW.position, 0.45, true);
    expect([first.indoor_hall, first.indoor_f1, first.indoor_f2]).toEqual([true, true, false]);
    const far2 = model.places
      .filter((place) => place.floor === 2)
      .map((place) => pointsOf(place.points)[0]!)
      .find((at) => Math.hypot(at.x - model.stairs.x, at.z - model.stairs.z) > 30);
    expect(far2).toBeDefined();
    const second = indoorParts(far2!, model.floor2.height, true);
    expect([second.indoor_f1, second.indoor_f2, second.indoor_f3, second.indoor_stairs]).toEqual([false, true, false, true]);
    const atStairs = indoorParts(STAIRS_VIEW.position, 0.45, true);
    expect([atStairs.indoor_hall, atStairs.indoor_stairs, atStairs.indoor_f1, atStairs.indoor_f2, atStairs.indoor_f3, atStairs.indoor_f4]).toEqual([true, true, true, true, true, true]);
    const third = indoorParts(far2!, FLOOR3_VIEW.height, true);
    expect([third.indoor_f1, third.indoor_f2, third.indoor_f3, third.indoor_f4]).toEqual([false, false, true, false]);
    expect(placeAt(FLOOR3_VIEW.position, FLOOR3_VIEW.height).label).toBe('Этаж 3 · Холл у лестницы');
  });
});

describe('корпус С (восточная часть)', () => {
  const east = { x: Math.sin(EAST_VIEW.yaw), z: -Math.cos(EAST_VIEW.yaw) };
  const south = { x: -east.z, z: east.x };
  const back = (dir: { x: number; z: number }) => ({ x: -dir.x, z: -dir.z });
  const walker = (start: { x: number; z: number }, startHeight: number) => {
    const state = { position: start, height: groundHeight(start, startHeight) };
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        state.position = step(state.position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, state.height);
        state.height = groundHeight(state.position, state.height);
      }
    };
    return { state, go };
  };

  it('из коридора корпуса С выходят в главный холл и уходят по коридору на восток', () => {
    expect(placeAt(EAST_VIEW.position, 0.45).label).toBe('Этаж 1 · Коридор из главного холла');
    const toHall = walker(EAST_VIEW.position, 0.45);
    toHall.go(back(east), 20);
    expect(placeAt(toHall.state.position, toHall.state.height).label).toBe('Этаж 1 · Холл');
    const along = walker(EAST_VIEW.position, 0.45);
    along.go(east, 40);
    expect(Math.hypot(along.state.position.x - EAST_VIEW.position.x, along.state.position.z - EAST_VIEW.position.z)).toBeGreaterThan(15);
    expect(along.state.height).toBeCloseTo(0.45, 2);
    expect(canStand(along.state.position)).toBe(true);
  });

  it('по лестнице корпуса С поднимаются с первого этажа на четвёртый и идут по коридору', () => {
    const { state, go } = walker(EAST_STAIRS_VIEW.position, 0.45);
    expect(state.height).toBeCloseTo(0.45, 2);
    const levels = [0.45, FLOOR2_VIEW.height, FLOOR3_VIEW.height, FLOOR4_VIEW.height];
    for (let floor = 2; floor <= 4; floor += 1) {
      go(back(east), 1.5); // к западному маршу
      go(south, 5); // вверх до промежуточной площадки
      expect(state.height).toBeCloseTo((levels[floor - 2]! + levels[floor - 1]!) / 2, 1);
      go(east, 3); // к восточному маршу
      go(back(south), 5); // вверх на площадку следующего этажа
      expect(state.height).toBeCloseTo(levels[floor - 1]!, 2);
      expect(placeAt(state.position, state.height).label).toBe(`Этаж ${floor} · Лестница корпуса С`);
      go(back(east), 1.5);
    }
    // на четвёртом этаже: вниз с площадки мимо марша не шагнуть, а по коридору идти можно
    const top = { ...state.position };
    go(back(east), 1.5);
    go(south, 5);
    expect(state.height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    state.position = top;
    go(back(south), 1.6);
    go(east, 40);
    expect(Math.hypot(state.position.x - top.x, state.position.z - top.z)).toBeGreaterThan(30);
    expect(state.height).toBeCloseTo(FLOOR4_VIEW.height, 2);
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_e4, shown.indoor_e1, shown.indoor_estairs]).toEqual([true, false, true]);
  });
});

describe('корпус А (северная часть)', () => {
  const north = { x: Math.sin(NORTH_A_VIEW.yaw), z: -Math.cos(NORTH_A_VIEW.yaw) };
  const east = { x: -north.z, z: north.x };
  const back = (dir: { x: number; z: number }) => ({ x: -dir.x, z: -dir.z });
  const walker = (start: { x: number; z: number }, startHeight: number) => {
    const state = { position: start, height: groundHeight(start, startHeight) };
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        state.position = step(state.position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, state.height);
        state.height = groundHeight(state.position, state.height);
      }
    };
    return { state, go };
  };
  const label = (state: { position: { x: number; z: number }; height: number }) => placeAt(state.position, state.height).label;

  it('со второго этажа главного корпуса по переходу попадают в корпус А и идут по его коридору', () => {
    const { state, go } = walker(NORTH_A_VIEW.position, NORTH_A_VIEW.height);
    expect(label(state)).toBe('Этаж 2 · Коридор ФИСМО');
    go(north, 5);
    expect(label(state)).toBe('Этаж 2 · Переход в главный корпус');
    go(north, 6);
    expect(label(state)).toBe('Этаж 2 · Холл у лифтов');
    go(north, 6);
    expect(label(state)).toBe('Этаж 2 · Коридор у ауд. А205');
    expect(state.height).toBeCloseTo(NORTH_A_VIEW.height, 2);
    // дальше на север — стена коридора: в кабинеты не попасть
    const atWall = { ...state.position };
    go(north, 6);
    expect(Math.hypot(state.position.x - atWall.x, state.position.z - atWall.z)).toBeLessThan(3.5);
    expect(label(state)).toBe('Этаж 2 · Коридор у ауд. А205');
    go(back(north), 2.5); // на середину коридора: у самой стены стоит кадка с растением
    const corner = { ...state.position };
    go(east, 40);
    expect(Math.hypot(state.position.x - corner.x, state.position.z - corner.z)).toBeGreaterThan(20);
    expect(label(state)).toBe('Этаж 2 · Коридор у ауд. А205');
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_a2, shown.indoor_a1, shown.indoor_a3, shown.indoor_astairs]).toEqual([true, false, false, true]);
    // и обратно тем же путём — в главный корпус
    const home = walker(NORTH_A_VIEW.position, NORTH_A_VIEW.height);
    home.go(north, 9);
    home.go(back(north), 12);
    expect(label(home.state)).toBe('Этаж 2 · Коридор ФИСМО');
  });

  it('под переходом человек остаётся на земле, а сквозь стены корпуса А с улицы не пройти', () => {
    expect(groundHeight(NORTH_A_UNDER, 0)).toBe(0);
    expect(canStand(NORTH_A_UNDER)).toBe(true);
    const { state, go } = walker(NORTH_A_UNDER, 0);
    go(east, 6);
    go(north, 15);
    expect(state.height).toBe(0);
    expect(placeAt(state.position, state.height).floor).toBeNull();
    // на той же точке, но на высоте второго этажа — это переход
    expect(groundHeight(NORTH_A_UNDER, NORTH_A_VIEW.height)).toBeCloseTo(NORTH_A_VIEW.height, 2);
  });

  it('по лестнице корпуса А поднимаются с первого этажа на пятый и не падают с верхней площадки', () => {
    const { state, go } = walker(NORTH_A_STAIRS_VIEW.position, 0.45);
    expect(state.height).toBeCloseTo(0.45, 2);
    expect(label(state)).toBe('Этаж 1 · Лестница корпуса А');
    expect(FLOOR_LEVELS).toHaveLength(5);
    go(back(east), 1.2); // к западному маршу
    for (let floor = 2; floor <= 5; floor += 1) {
      go(back(north), 5.5); // вверх на юг до промежуточной площадки
      expect(state.height).toBeCloseTo((FLOOR_LEVELS[floor - 2]! + FLOOR_LEVELS[floor - 1]!) / 2, 1);
      go(east, 2.6); // к восточному маршу
      go(north, 5); // вверх на площадку следующего этажа
      expect(state.height).toBeCloseTo(FLOOR_LEVELS[floor - 1]!, 2);
      expect(label(state)).toBe(`Этаж ${floor} · Лестница корпуса А`);
      go(back(east), 2.6);
    }
    // на пятом этаже: над западным маршем площадки нет — вниз не шагнуть
    go(back(north), 5.5);
    expect(state.height).toBeCloseTo(FLOOR_LEVELS[4]!, 2);
    expect(label(state)).toBe('Этаж 5 · Лестница корпуса А');
    // а по коридору пятого этажа идти можно
    go(north, 4);
    const start = { ...state.position };
    go(east, 30);
    expect(Math.hypot(state.position.x - start.x, state.position.z - start.z)).toBeGreaterThan(20);
    expect(label(state)).toBe('Этаж 5 · Коридор у ауд. А505');
    expect(placeAt(state.position, state.height).map.file).toBe('minimap_f5.png');
    const spot = onMiniMap(placeAt(state.position, state.height).map, state.position);
    expect(spot.x > 0 && spot.x < 1 && spot.y > 0 && spot.y < 1).toBe(true);
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_a5, shown.indoor_a4, shown.indoor_astairs]).toEqual([true, false, true]);
  });

  it('двери корпуса А: номера не уточнены, подписаны только лифты и лестница', () => {
    const doors = DOORS.filter((door) => door.wing === 'a');
    expect(doors.length).toBeGreaterThan(60);
    expect(new Set(doors.map((door) => door.floor))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(doors.map((door) => door.label))).toEqual(new Set(['не уточнено', 'Лифты', 'Лестница (восточная)']));
    expect(doors.some((door) => door.unsure)).toBe(true);
  });
});

describe('корпус Н (Центр Интернет)', () => {
  const east = { x: Math.sin(NORTH_N_VIEW.yaw), z: -Math.cos(NORTH_N_VIEW.yaw) };
  const south = { x: -east.z, z: east.x };
  const back = (dir: { x: number; z: number }) => ({ x: -dir.x, z: -dir.z });
  const north = back(south);
  const west = back(east);
  const walker = (start: { x: number; z: number }, startHeight: number) => {
    const state = { position: { ...start }, height: groundHeight(start, startHeight) };
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        state.position = step(state.position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, state.height);
        state.height = groundHeight(state.position, state.height);
      }
    };
    return { state, go };
  };
  const label = (state: { position: { x: number; z: number }; height: number }) => placeAt(state.position, state.height).label;
  const moved = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.hypot(to.x - from.x, to.z - from.z);

  it('с улицы входят через дверь Центра Интернет и идут по коридору первого этажа, а сквозь стену рядом — нет', () => {
    const { state, go } = walker(NORTH_N_VIEW.position, 0);
    expect(label(state)).toMatch(/^Улица · /);
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_n1, shown.indoor_nstairs, shown.indoor_n2]).toEqual([true, true, false]);
    go(east, 8);
    expect(label(state)).toBe('Этаж 1 · Вход в Центр Интернет');
    expect(state.height).toBeCloseTo(0.45, 2);
    go(east, 6);
    expect(label(state)).toBe('Этаж 1 · Лестница Центра Интернет');
    go(east, 10);
    expect(label(state)).toBe('Этаж 1 · Коридор Центра Интернет');
    const start = { ...state.position };
    go(east, 40);
    expect(moved(start, state.position)).toBeGreaterThan(25);
    expect(placeAt(state.position, state.height).floor).toBe(1);
    expect(canStand(state.position)).toBe(true);
    // в пяти метрах от двери — глухая стена
    const side = walker({ x: NORTH_N_VIEW.position.x + north.x * 5, z: NORTH_N_VIEW.position.z + north.z * 5 }, 0);
    side.go(east, 12);
    expect(side.state.height).toBe(0);
    expect(label(side.state)).toMatch(/^Улица · /);
  });

  it('по лестнице Центра Интернет поднимаются с первого этажа на пятый и не падают с верхней площадки', () => {
    const { state, go } = walker(NORTH_N_STAIRS_VIEW.position, 0.45);
    expect(label(state)).toBe('Этаж 1 · Лестница Центра Интернет');
    go(south, 2.3); // к южному маршу
    for (let floor = 2; floor <= 5; floor += 1) {
      go(west, 5.5); // вверх на запад до промежуточной площадки
      expect(state.height).toBeCloseTo((FLOOR_LEVELS[floor - 2]! + FLOOR_LEVELS[floor - 1]!) / 2, 1);
      go(north, 4.6); // к северному маршу
      go(east, 5); // вверх на площадку следующего этажа
      expect(state.height).toBeCloseTo(FLOOR_LEVELS[floor - 1]!, 2);
      expect(label(state)).toBe(`Этаж ${floor} · Лестница Центра Интернет`);
      go(south, 4.6);
    }
    // на пятом этаже над южным маршем площадки нет — вниз не шагнуть
    go(west, 5.5);
    expect(state.height).toBeCloseTo(FLOOR_LEVELS[4]!, 2);
    go(north, 2.3);
    go(east, 5);
    expect(label(state)).toBe('Этаж 5 · Коридор у ауд. Н502');
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_n5, shown.indoor_nstairs]).toEqual([true, true]);
  });

  it('со второго этажа западного крыла по переходу попадают в корпус Н, а оттуда по коридору — в корпус А', () => {
    const { state, go } = walker(NORTH_N_BRIDGE_VIEW.position, NORTH_N_BRIDGE_VIEW.height);
    expect(label(state)).toBe('Этаж 2 · Западное крыло');
    go(north, 6);
    expect(label(state)).toBe('Этаж 2 · Переход в западное крыло');
    go(east, 3.2); // коридор корпуса Н начинается восточнее оси перехода
    go(north, 8);
    expect(label(state)).toBe('Этаж 2 · Холл экономического факультета');
    go(north, 11);
    const start = { ...state.position };
    go(east, 75);
    expect(moved(start, state.position)).toBeGreaterThan(55);
    expect(label(state)).toBe('Этаж 2 · Коридор у ауд. А205');
    expect(state.height).toBeCloseTo(NORTH_N_BRIDGE_VIEW.height, 2);
    // под переходом человек остаётся на земле
    expect(groundHeight(NORTH_N_UNDER, 0)).toBe(0);
    expect(canStand(NORTH_N_UNDER)).toBe(true);
  });

  it('на пятом этаже коридоры корпусов Н и А не соединены: между ними стена', () => {
    const levels = model.northA.levels;
    const place = (model.places as { floor: number | null; title: string; points: number[] }[]).find((item) => item.floor === 5 && item.title === 'Коридор корпуса Н, восточный конец');
    expect(place).toBeDefined();
    const corners = pointsOf(place!.points);
    const centre = { x: corners.reduce((sum, at) => sum + at.x, 0) / 4, z: corners.reduce((sum, at) => sum + at.z, 0) / 4 };
    const { state, go } = walker(centre, levels[4]!);
    go(east, 30);
    expect(label(state)).toBe('Этаж 5 · Коридор корпуса Н, восточный конец');
  });

  it('двери корпуса Н: номера не уточнены, подписан только дисплейный класс с панорамы тура', () => {
    const doors = DOORS.filter((door) => door.wing === 'n');
    expect(doors.length).toBeGreaterThan(100);
    expect(new Set(doors.map((door) => door.floor))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(doors.map((door) => door.label))).toEqual(new Set(['не уточнено', 'Дисплейный класс академии Cisco']));
  });
});

describe('библиотека (корпус А3)', () => {
  const west = { x: Math.sin(NORTH_L_VIEW.yaw), z: -Math.cos(NORTH_L_VIEW.yaw) };
  const north = { x: -west.z, z: west.x };
  const back = (dir: { x: number; z: number }) => ({ x: -dir.x, z: -dir.z });
  const east = back(west);
  const south = back(north);
  const walker = (start: { x: number; z: number }, startHeight: number) => {
    const state = { position: { ...start }, height: groundHeight(start, startHeight) };
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        state.position = step(state.position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, state.height);
        state.height = groundHeight(state.position, state.height);
      }
    };
    return { state, go };
  };
  const label = (state: { position: { x: number; z: number }; height: number }) => placeAt(state.position, state.height).label;
  const centreOf = (floor: number, title: string) => {
    const place = (model.places as { floor: number | null; title: string; points: number[] }[]).find((item) => item.floor === floor && item.title === title);
    expect(place).toBeDefined();
    const corners = pointsOf(place!.points);
    return { x: corners.reduce((sum, at) => sum + at.x, 0) / 4, z: corners.reduce((sum, at) => sum + at.z, 0) / 4 };
  };

  it('с улицы входят в библиотеку, проходят в холл и в коридор первого этажа, а сквозь стену рядом — нет', () => {
    const { state, go } = walker(NORTH_L_VIEW.position, 0);
    expect(label(state)).toMatch(/^Улица · /);
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_l1, shown.indoor_lstairs, shown.indoor_l2, shown.indoor_n1]).toEqual([true, true, false, false]);
    go(west, 8);
    expect(label(state)).toBe('Этаж 1 · Вход в библиотеку');
    expect(state.height).toBeCloseTo(0.45, 2);
    go(west, 4);
    expect(label(state)).toBe('Этаж 1 · Лестница библиотеки');
    go(west, 6);
    expect(label(state)).toBe('Этаж 1 · Холл корпуса А3');
    go(west, 3.5);
    go(south, 8);
    expect(label(state)).toBe('Этаж 1 · Коридор библиотеки');
    expect(canStand(state.position)).toBe(true);
    const side = walker({ x: NORTH_L_VIEW.position.x + north.x * 5, z: NORTH_L_VIEW.position.z + north.z * 5 }, 0);
    side.go(west, 12);
    expect(side.state.height).toBe(0);
    expect(label(side.state)).toMatch(/^Улица · /);
  });

  it('по лестнице библиотеки поднимаются с первого этажа на пятый и не падают с верхней площадки', () => {
    const { state, go } = walker(NORTH_L_STAIRS_VIEW.position, 0.45);
    expect(label(state)).toBe('Этаж 1 · Лестница библиотеки');
    go(south, 2.05); // к южному маршу
    for (let floor = 2; floor <= 5; floor += 1) {
      go(east, 5.5); // вверх на восток до промежуточной площадки
      expect(state.height).toBeCloseTo((FLOOR_LEVELS[floor - 2]! + FLOOR_LEVELS[floor - 1]!) / 2, 1);
      go(north, 4.1); // к северному маршу
      go(west, 5); // вверх на площадку следующего этажа
      expect(state.height).toBeCloseTo(FLOOR_LEVELS[floor - 1]!, 2);
      expect(label(state)).toBe(`Этаж ${floor} · Лестница библиотеки`);
      go(south, 4.1);
    }
    go(east, 5.5); // на пятом этаже над южным маршем площадки нет
    expect(state.height).toBeCloseTo(FLOOR_LEVELS[4]!, 2);
    go(north, 2.05);
    go(west, 6);
    expect(label(state)).toBe('Этаж 5 · Холл корпуса А3');
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_l5, shown.indoor_lstairs]).toEqual([true, true]);
  });

  it('на четвёртом этаже из коридора корпуса А проходят в холл библиотеки, а на втором между ними стена', () => {
    const fourth = walker(centreOf(4, 'Коридор у ауд. А405'), FLOOR_LEVELS[3]!);
    fourth.go(east, 45);
    expect(label(fourth.state)).toBe('Этаж 4 · Холл корпуса А3');
    expect(fourth.state.height).toBeCloseTo(FLOOR_LEVELS[3]!, 2);
    const second = walker(centreOf(2, 'Коридор у ауд. А205'), FLOOR_LEVELS[1]!);
    second.go(east, 45);
    expect(label(second.state)).toBe('Этаж 2 · Коридор у ауд. А205');
  });

  it('двери библиотеки: номера не уточнены, подписаны только залы с панорам тура и лестница', () => {
    const doors = DOORS.filter((door) => door.wing === 'l');
    expect(doors.length).toBeGreaterThan(30);
    expect(new Set(doors.map((door) => door.floor))).toEqual(new Set([1, 2, 3, 4, 5]));
    const named = new Set(doors.map((door) => door.label).filter((name) => name !== 'не уточнено'));
    expect(named).toEqual(
      new Set([
        'Электронный и атомный силовой микроскопы',
        'ЯМР- и ЭПР-комплексы',
        'Лестница (западная)',
        'Зал доступа к электронным ресурсам, ауд. А213',
        'Отдел художественной литературы, ауд. А217',
        'Зал каталога библиотеки, ауд. А219',
        'Конференц-зал, ауд. А313',
        'Зал заседаний совета университета',
        'Аудитория А423',
      ]),
    );
  });
});

describe('корпус Л (А4)', () => {
  const north = { x: Math.sin(KORP_L_VIEW.yaw), z: -Math.cos(KORP_L_VIEW.yaw) };
  const east = { x: -north.z, z: north.x };
  const back = (dir: { x: number; z: number }) => ({ x: -dir.x, z: -dir.z });
  const south = back(north);
  const west = back(east);
  const walker = (start: { x: number; z: number }, startHeight: number) => {
    const state = { position: { ...start }, height: groundHeight(start, startHeight) };
    const go = (dir: { x: number; z: number }, metres: number) => {
      for (let i = 0; i < metres / 0.1; i += 1) {
        state.position = step(state.position, { x: dir.x * 0.1, z: dir.z * 0.1 }, 0.4, state.height);
        state.height = groundHeight(state.position, state.height);
      }
    };
    return { state, go };
  };
  const label = (state: { position: { x: number; z: number }; height: number }) => placeAt(state.position, state.height).label;

  it('с улицы входят в корпус Л с юга и идут по коридору на север, а сквозь стену рядом — нет', () => {
    const { state, go } = walker(KORP_L_VIEW.position, 0);
    expect(label(state)).toMatch(/^Улица · /);
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_k1, shown.indoor_kstairs]).toEqual([true, true]);
    go(north, 9);
    expect(label(state)).toBe('Этаж 1 · Холл ИППК');
    expect(state.height).toBeCloseTo(0.45, 2);
    go(north, 20); // прямо от двери — в коридор, без поворотов
    expect(label(state)).toBe('Этаж 1 · Коридор корпуса Л');
    expect(canStand(state.position)).toBe(true);
    go(north, 30); // коридор кончается окном в северной стене — наружу не выйти
    expect(label(state)).toBe('Этаж 1 · Коридор корпуса Л');
    const side = walker({ x: KORP_L_VIEW.position.x + east.x * 5, z: KORP_L_VIEW.position.z + east.z * 5 }, 0);
    side.go(north, 12);
    expect(side.state.height).toBe(0);
    expect(label(side.state)).toMatch(/^Улица · /);
  });

  it('по лестнице корпуса Л поднимаются с первого этажа на пятый и выходят в холл', () => {
    const { state, go } = walker(KORP_L_STAIRS_VIEW.position, 0.45);
    expect(label(state)).toBe('Этаж 1 · Лестница корпуса Л');
    go(north, 0.85); // к северному маршу
    for (let floor = 2; floor <= 5; floor += 1) {
      go(west, 5.5); // вверх на запад до промежуточной площадки
      expect(state.height).toBeCloseTo((FLOOR_LEVELS[floor - 2]! + FLOOR_LEVELS[floor - 1]!) / 2, 1);
      go(south, 1.7); // к южному маршу
      go(east, 5.5); // вверх на площадку следующего этажа
      expect(state.height).toBeCloseTo(FLOOR_LEVELS[floor - 1]!, 2);
      expect(label(state)).toBe(`Этаж ${floor} · Лестница корпуса Л`);
      go(north, 1.7);
    }
    go(west, 5.5); // на пятом этаже над северным маршем площадки нет
    expect(state.height).toBeCloseTo(FLOOR_LEVELS[4]!, 2);
    go(east, 6);
    expect(label(state)).toBe('Этаж 5 · Холл корпуса А4');
    const shown = indoorParts(state.position, state.height, true);
    expect([shown.indoor_k5, shown.indoor_kstairs]).toEqual([true, true]);
  });

  it('двери корпуса Л: подписаны только помещения с панорам тура, остальные не уточнены', () => {
    const doors = DOORS.filter((door) => door.wing === 'k');
    expect(doors.length).toBeGreaterThan(60);
    expect(new Set(doors.map((door) => door.floor))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(doors.map((door) => door.label))).toEqual(
      new Set([
        'не уточнено',
        'Компьютерный класс 1013Л',
        'Компьютерный класс 1015Л',
        'Лестница на 2 этаж (не построена)',
        'Аудитория',
        'Буфет',
        'Лестница (северная)',
        'Большой конференц-зал',
        'Малый конференц-зал',
      ]),
    );
  });
});
