// Кэш ответов gifs.ru и ограничение числа запросов на одного человека.
// Сейчас всё хранится в памяти сервера (Redis в проекте пока нет). Когда серверов станет несколько,
// достаточно подменить `GifCache` на вариант с Redis — остальной код о хранилище не знает.

import type { GifsPage } from '@app/shared';

export interface GifCache {
  get(key: string): Promise<GifsPage | null>;
  set(key: string, page: GifsPage, ttlMs: number): Promise<void>;
}

export class MemoryGifCache implements GifCache {
  private readonly entries = new Map<string, { page: GifsPage; expiresAt: number }>();

  constructor(private readonly maxEntries = 500) {}

  async get(key: string): Promise<GifsPage | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.page;
  }

  async set(key: string, page: GifsPage, ttlMs: number): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { page, expiresAt: Date.now() + ttlMs });
    // Переполнился — убираем самые старые записи
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

// Не больше `max` запросов в минуту на один аккаунт
export class PerAccountLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs = 60_000,
  ) {}

  // true — запрос разрешён
  hit(accountId: string): boolean {
    const now = Date.now();
    if (this.windows.size > 10_000) {
      for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
    }
    const window = this.windows.get(accountId);
    if (!window || window.resetAt <= now) {
      this.windows.set(accountId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    window.count += 1;
    return window.count <= this.max;
  }
}
