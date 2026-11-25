import { describe, expect, it } from 'vitest';
import { formatTemp } from './weather';

describe('температура', () => {
  it('пишет знак', () => {
    expect([12, -3, 0, 0.4, -0.4, 7.6].map(formatTemp)).toEqual(['+12°', '−3°', '0°', '0°', '0°', '+8°']);
  });
});
