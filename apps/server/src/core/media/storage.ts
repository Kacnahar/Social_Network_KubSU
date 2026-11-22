import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// «Дверь» к месту хранения фото: при разработке — папка на диске, при запуске — облачное хранилище
export interface MediaStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9-]+\.[a-z0-9]+$/;

export class DiskMediaStorage implements MediaStorage {
  constructor(private readonly dir: string) {}

  private path(key: string): string {
    if (!SAFE_KEY.test(key)) throw new Error('Недопустимое имя файла');
    return join(this.dir, key);
  }

  async put(key: string, data: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(key), data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}

export class MemoryMediaStorage implements MediaStorage {
  readonly files = new Map<string, Buffer>();

  async put(key: string, data: Buffer): Promise<void> {
    this.files.set(key, data);
  }

  async get(key: string): Promise<Buffer | null> {
    return this.files.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }
}
