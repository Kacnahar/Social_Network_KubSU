import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('принимает корректный ответ', () => {
    const parsed = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'app-server',
      version: '0.0.0',
      time: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });

  it('отклоняет ответ без статуса ok', () => {
    const parsed = healthResponseSchema.safeParse({
      status: 'down',
      service: 'app-server',
      version: '0.0.0',
      time: new Date().toISOString(),
    });
    expect(parsed.success).toBe(false);
  });
});
