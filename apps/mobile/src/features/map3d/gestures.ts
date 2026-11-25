import { FOV, type Controls } from './controls';
import { clamp } from './geo';
import { panOrbit, turnOrbit, zoomOrbit } from './orbit';

// Разбор касаний. Экран получает список всех пальцев сразу; здесь решаем, что каждый из них делает.
// Прогулка: палец в левой половине — джойстик, в правой — поворот головы.
// Сверху: один палец двигает карту, два — приближают, поворачивают и наклоняют.

export type Touch = { identifier: number | string; pageX: number; pageY: number };
type Finger = { role: 'stick' | 'look' | 'map'; startX: number; startY: number; x: number; y: number; startedAt: number; travelled: number };

export const STICK_RADIUS = 56;
const LOOK_SPEED = 0.0055;
const TAP_MS = 320;
const TAP_PX = 10;

export type StickView = { originX: number; originY: number; knobX: number; knobY: number } | null;
export type GestureEvents = {
  onStick: (view: StickView) => void;
  onTap: (x: number, y: number) => void;
};

export function createGestures(controls: Controls, events: GestureEvents) {
  const fingers = new Map<number | string, Finger>();
  let multi = false; // в этом жесте было два пальца — значит, это не «нажатие»
  let lastMoveAt = 0;

  function handle(touches: readonly Touch[], view: { width: number; height: number }, now: number, rotateInsteadOfPan = false) {
    const seen = new Set<number | string>();
    const before = fingers.size;

    // Пара пальцев до обновления — чтобы сравнить «было» и «стало»
    const pairBefore = controls.mode === 'top' && fingers.size >= 2 ? [...fingers.values()].slice(0, 2).map((finger) => ({ x: finger.x, y: finger.y })) : null;
    const pairIds = [...fingers.keys()].slice(0, 2);

    for (const touch of touches) {
      seen.add(touch.identifier);
      const finger = fingers.get(touch.identifier);
      if (!finger) {
        const role = controls.mode === 'top' ? 'map' : touch.pageX < view.width / 2 && ![...fingers.values()].some((other) => other.role === 'stick') ? 'stick' : 'look';
        fingers.set(touch.identifier, { role, startX: touch.pageX, startY: touch.pageY, x: touch.pageX, y: touch.pageY, startedAt: now, travelled: 0 });
        if (fingers.size > 1) multi = true;
        if (role === 'stick') events.onStick({ originX: touch.pageX, originY: touch.pageY, knobX: 0, knobY: 0 });
        continue;
      }
      const dx = touch.pageX - finger.x;
      const dy = touch.pageY - finger.y;
      finger.x = touch.pageX;
      finger.y = touch.pageY;
      finger.travelled += Math.hypot(dx, dy);

      if (finger.role === 'stick') {
        let knobX = finger.x - finger.startX;
        let knobY = finger.y - finger.startY;
        const length = Math.hypot(knobX, knobY);
        if (length > STICK_RADIUS) {
          knobX = (knobX / length) * STICK_RADIUS;
          knobY = (knobY / length) * STICK_RADIUS;
        }
        controls.stick = { x: knobX / STICK_RADIUS, y: knobY / STICK_RADIUS };
        events.onStick({ originX: finger.startX, originY: finger.startY, knobX, knobY });
      } else if (finger.role === 'look') {
        controls.yaw += dx * LOOK_SPEED;
        controls.pitch = clamp(controls.pitch - dy * LOOK_SPEED, -1.2, 1.2);
      } else if (fingers.size === 1 && before === 1) {
        if (rotateInsteadOfPan) {
          controls.orbit = turnOrbit(controls.orbit, -dx * 0.006, -dy * 0.006);
        } else {
          controls.orbit = panOrbit(controls.orbit, dx, dy, view.height, FOV);
          const dt = Math.max(0.008, (now - lastMoveAt) / 1000);
          // Сглаженная скорость — из неё получается инерция после отпускания
          controls.panVelocity.x = controls.panVelocity.x * 0.6 + (dx / dt) * 0.4;
          controls.panVelocity.y = controls.panVelocity.y * 0.6 + (dy / dt) * 0.4;
        }
        lastMoveAt = now;
      }
    }

    // Два пальца: щипок — приближение, поворот пары — поворот карты, сдвиг пары вверх-вниз — наклон
    if (pairBefore && pairIds.every((id) => seen.has(id))) {
      const [a0, b0] = pairBefore as [{ x: number; y: number }, { x: number; y: number }];
      const a1 = fingers.get(pairIds[0]!)!;
      const b1 = fingers.get(pairIds[1]!)!;
      const span0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
      const span1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      let orbit = controls.orbit;
      if (span0 > 10 && span1 > 10) {
        orbit = zoomOrbit(orbit, span1 / span0);
        let turn = Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x);
        if (turn > Math.PI) turn -= Math.PI * 2;
        if (turn < -Math.PI) turn += Math.PI * 2;
        orbit = turnOrbit(orbit, -turn, 0);
      }
      const moveA = a1.y - a0.y;
      const moveB = b1.y - b0.y;
      // Наклон — только когда оба пальца едут в одну сторону по вертикали
      if (moveA * moveB > 0) orbit = turnOrbit(orbit, 0, (-(moveA + moveB) / 2) * 0.006);
      controls.orbit = orbit;
      controls.panVelocity = { x: 0, y: 0 };
    }

    for (const [id, finger] of fingers) {
      if (seen.has(id)) continue;
      fingers.delete(id);
      if (finger.role === 'stick') {
        controls.stick = { x: 0, y: 0 };
        events.onStick(null);
      }
      if (finger.role === 'map' && !multi && now - finger.startedAt < TAP_MS && finger.travelled < TAP_PX) {
        controls.panVelocity = { x: 0, y: 0 };
        events.onTap(finger.x, finger.y);
      }
      // Палец стоял на месте перед отпусканием — инерции быть не должно
      if (finger.role === 'map' && now - lastMoveAt > 90) controls.panVelocity = { x: 0, y: 0 };
    }

    controls.touching = fingers.size > 0;
    if (fingers.size === 0) multi = false;
  }

  // Смена режима посреди жеста: забываем все пальцы
  function reset() {
    fingers.clear();
    multi = false;
    controls.stick = { x: 0, y: 0 };
    controls.touching = false;
    controls.panVelocity = { x: 0, y: 0 };
    events.onStick(null);
  }

  return { handle, reset };
}
