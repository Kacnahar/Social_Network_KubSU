// Тестовые фото для объявлений: маленькие серые картинки с плавным переходом, собираются на лету (без файлов и интернета).
// Нужны только для проверки внешнего вида страницы объявления; настоящие фото приедут с сервера.

const crcTable = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(bytes: number[]): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (crcTable[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function chunk(type: string, data: number[]): number[] {
  const body = [...type].map((ch) => ch.charCodeAt(0)).concat(data);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

// zlib без сжатия («stored»-блоки): просто и надёжно
function zlibStored(raw: number[]): number[] {
  const out = [0x78, 0x01];
  for (let i = 0; i < raw.length; i += 65535) {
    const part = raw.slice(i, i + 65535);
    const last = i + 65535 >= raw.length ? 1 : 0;
    out.push(last, part.length & 255, part.length >>> 8, ~part.length & 255, (~part.length >>> 8) & 255, ...part);
  }
  let a = 1;
  let b = 0;
  for (const v of raw) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  return out.concat(u32(((b << 16) | a) >>> 0));
}

const cache = new Map<number, string>();

// Серая картинка 72×72: диагональный переход от светлого к тёмному, номер seed меняет угол и тон
export function testPhoto(seed: number): string {
  const cached = cache.get(seed);
  if (cached) return cached;
  const size = 72;
  const raw: number[] = [];
  const dark = 40 + (seed % 5) * 14;
  const light = 150 + ((seed * 7) % 6) * 14;
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const t = seed % 2 === 0 ? (x + y) / (2 * size) : (size - x + y) / (2 * size);
      const ring = Math.abs(Math.hypot(x - size / 2, y - size / 2) - (14 + (seed % 4) * 4)) < 1.6 ? 40 : 0;
      const v = Math.min(255, Math.round(dark + (light - dark) * t) + ring);
      raw.push(v, v, v);
    }
  }
  const png = [137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', [...u32(size), ...u32(size), 8, 2, 0, 0, 0]), ...chunk('IDAT', zlibStored(raw)), ...chunk('IEND', [])];
  let binary = '';
  for (const byte of png) binary += String.fromCharCode(byte);
  const uri = `data:image/png;base64,${btoa(binary)}`;
  cache.set(seed, uri);
  return uri;
}

export const testPhotos = (first: number, count: number): string[] => Array.from({ length: count }, (_, i) => testPhoto(first + i));
