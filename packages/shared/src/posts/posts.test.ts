import { describe, expect, it } from 'vitest';
import { createPostRequestSchema } from './posts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('данные поста', () => {
  it('принимает только текст, только фото и оба вместе', () => {
    expect(createPostRequestSchema.safeParse({ text: 'Привет' }).success).toBe(true);
    expect(createPostRequestSchema.safeParse({ photoMediaIds: [id(1)] }).success).toBe(true);
    expect(createPostRequestSchema.safeParse({ text: 'Привет', photoMediaIds: [id(1), id(2)] }).success).toBe(true);
  });

  it('отклоняет пустой пост, в том числе из одних пробелов', () => {
    expect(createPostRequestSchema.safeParse({}).success).toBe(false);
    expect(createPostRequestSchema.safeParse({ text: '   ' }).success).toBe(false);
  });

  it('не больше 10 фото и без повторов', () => {
    const eleven = Array.from({ length: 11 }, (_, index) => id(index));
    expect(createPostRequestSchema.safeParse({ photoMediaIds: eleven }).success).toBe(false);
    expect(createPostRequestSchema.safeParse({ photoMediaIds: eleven.slice(0, 10) }).success).toBe(true);
    expect(createPostRequestSchema.safeParse({ photoMediaIds: [id(1), id(1)] }).success).toBe(false);
  });

  it('текст не длиннее 5000 знаков', () => {
    expect(createPostRequestSchema.safeParse({ text: 'а'.repeat(5001) }).success).toBe(false);
  });
});
