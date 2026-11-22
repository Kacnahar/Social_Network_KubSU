import { describe, expect, it } from 'vitest';
import { authStartRequestSchema } from './auth';

describe('authStartRequestSchema', () => {
  it('приводит почту к нижнему регистру и обрезает пробелы', () => {
    const parsed = authStartRequestSchema.parse({ email: '  Student@Example.COM ' });
    expect(parsed.email).toBe('student@example.com');
  });

  it('отклоняет не почту', () => {
    expect(authStartRequestSchema.safeParse({ email: 'не почта' }).success).toBe(false);
  });
});
