import { describe, expect, it } from 'vitest';
import { baseScale, clampOffset, clampZoom, cropRect, maxOffset, outputSize, rubberBand } from './cropMath';

const D = 300;

describe('обрезка фото', () => {
  it('при zoom=1 меньшая сторона равна кругу и по ней сдвигать нельзя', () => {
    expect(baseScale(1200, 800, D)).toBeCloseTo(300 / 800);
    const limit = maxOffset(1200, 800, D, 1);
    expect(limit.y).toBe(0);
    expect(limit.x).toBeCloseTo((1200 * (300 / 800) - 300) / 2);
  });
  it('сдвиг не выходит за границы, чтобы не осталось пустоты', () => {
    const out = clampOffset({ x: 999, y: -999 }, 1200, 800, D, 1);
    expect(out.y).toBe(0);
    expect(out.x).toBeCloseTo(75);
    const zoomed = clampOffset({ x: 999, y: -999 }, 1200, 800, D, 2);
    expect(zoomed.y).toBeCloseTo(-150);
  });
  it('масштаб держится в пределах от 1 до 5', () => {
    expect(clampZoom(0.4)).toBe(1);
    expect(clampZoom(9)).toBe(5);
  });
  it('резинка тянет туже за границей', () => {
    expect(rubberBand(50, 100)).toBe(50);
    expect(rubberBand(200, 100)).toBeCloseTo(100 + 100 * 0.35);
    expect(rubberBand(-200, 100)).toBeCloseTo(-135);
  });
  it('квадрат обрезки: по центру при нулевом сдвиге и внутри фото', () => {
    const r = cropRect(1200, 800, D, 1, { x: 0, y: 0 });
    expect(r.size).toBe(800);
    expect(r.originX).toBe(200);
    expect(r.originY).toBe(0);
    const edge = cropRect(1200, 800, D, 1, { x: 75, y: 0 });
    expect(edge.originX).toBe(0);
    const zoomed = cropRect(1200, 800, D, 2, { x: 0, y: 0 });
    expect(zoomed.size).toBe(400);
  });
  it('размер результата не больше 1024', () => {
    expect(outputSize(3000)).toBe(1024);
    expect(outputSize(500)).toBe(500);
  });
});
