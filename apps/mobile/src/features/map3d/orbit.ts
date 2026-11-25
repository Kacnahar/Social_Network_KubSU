import { clamp, type Box } from './geo';

// Камера режима «Сверху»: смотрит на точку земли target с расстояния distance.
// azimuth — поворот вокруг вертикали (0 — смотрим на север), tilt — наклон от вертикали (0 — строго сверху).
export type Orbit = { x: number; z: number; distance: number; azimuth: number; tilt: number };

export const ORBIT_LIMITS = { minDistance: 30, maxDistance: 900, maxTilt: (72 * Math.PI) / 180 };

export function clampOrbit(orbit: Orbit, bounds: Box): Orbit {
  return {
    x: clamp(orbit.x, bounds.minX, bounds.maxX),
    z: clamp(orbit.z, bounds.minZ, bounds.maxZ),
    distance: clamp(orbit.distance, ORBIT_LIMITS.minDistance, ORBIT_LIMITS.maxDistance),
    azimuth: orbit.azimuth,
    tilt: clamp(orbit.tilt, 0, ORBIT_LIMITS.maxTilt),
  };
}

// Где стоит камера
export function orbitEye(orbit: Orbit): { x: number; y: number; z: number } {
  const flat = Math.sin(orbit.tilt) * orbit.distance;
  return {
    x: orbit.x - Math.sin(orbit.azimuth) * flat,
    y: Math.cos(orbit.tilt) * orbit.distance,
    z: orbit.z + Math.cos(orbit.azimuth) * flat,
  };
}

// Сдвиг пальцем: карта едет за пальцем. dx, dy — пиксели экрана, viewHeight — высота экрана, fov — угол обзора
export function panOrbit(orbit: Orbit, dx: number, dy: number, viewHeight: number, fov: number): Orbit {
  const metersPerPixel = (2 * orbit.distance * Math.tan(fov / 2)) / viewHeight;
  // При наклоне дальние точки сжаты по вертикали экрана — компенсируем, чтобы точка под пальцем не убегала
  const forward = (dy * metersPerPixel) / Math.max(0.35, Math.cos(orbit.tilt));
  const right = dx * metersPerPixel;
  const sin = Math.sin(orbit.azimuth);
  const cos = Math.cos(orbit.azimuth);
  return {
    ...orbit,
    x: orbit.x - right * cos + forward * sin,
    z: orbit.z - right * sin - forward * cos,
  };
}

export const zoomOrbit = (orbit: Orbit, factor: number): Orbit => ({ ...orbit, distance: orbit.distance / factor });
export const turnOrbit = (orbit: Orbit, angle: number, tilt: number): Orbit => ({
  ...orbit,
  azimuth: orbit.azimuth + angle,
  tilt: orbit.tilt + tilt,
});

// Инерция: скорость плавно гаснет. Возвращает долю скорости, оставшуюся через dt секунд
export const friction = (dt: number, halfLife = 0.18) => Math.pow(0.5, dt / halfLife);
