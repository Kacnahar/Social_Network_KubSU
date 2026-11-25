import type { Orbit } from './orbit';
import { START } from './terrain';
import type { Vec2 } from './types';

export type MapMode = 'walk' | 'top';

// Общее изменяемое состояние управления. Его читает цикл отрисовки (60 раз в секунду) и меняют жесты,
// поэтому оно лежит в обычном объекте, а не в состоянии React: так экран не перерисовывается на каждое движение.
export type Controls = {
  mode: MapMode;
  // Прогулка
  position: Vec2;
  yaw: number; // 0 — смотрим на север, растёт при повороте направо
  pitch: number; // вверх — плюс
  stick: { x: number; y: number }; // джойстик, от -1 до 1; y вниз — назад
  keys: Set<string>;
  // После переноса в другое место: возле какой высоты искать пол (этаж). Сцена читает и сбрасывает в null
  snapHeight: number | null;
  // Высота пола под ногами сейчас; пишет сцена, читает подсказка «где я»
  feet: number;
  // Вид сверху
  orbit: Orbit;
  panVelocity: { x: number; y: number }; // пиксели в секунду, для инерции
  touching: boolean;
  // Заполняет сцена: перевод точки экрана в точку на земле
  pick: ((screenX: number, screenY: number) => Vec2 | null) | null;
};

export const EYE_HEIGHT = 1.7;
export const BODY_RADIUS = 0.4;
export const WALK_SPEED = 5; // м/с при полном наклоне джойстика: двор большой, шагом идти долго
export const FOV = (55 * Math.PI) / 180;

export function createControls(): Controls {
  return {
    mode: 'walk',
    position: { ...START.position },
    yaw: START.yaw,
    pitch: 0,
    stick: { x: 0, y: 0 },
    keys: new Set(),
    snapHeight: 0,
    feet: 0,
    orbit: { x: START.position.x, z: START.position.z - 70, distance: 300, azimuth: START.yaw, tilt: 0.95 },
    panVelocity: { x: 0, y: 0 },
    touching: false,
    pick: null,
  };
}
