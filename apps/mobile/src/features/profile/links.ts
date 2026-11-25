// Ссылки в профиле: до трёх; сервис определяется по адресу

export const MAX_LINKS = 3;

export type LinkService =
  | 'telegram' | 'whatsapp' | 'youtube' | 'vk' | 'threads' | 'instagram' | 'max' | 'github'
  | 'tiktok' | 'x' | 'linkedin' | 'behance' | 'dribbble' | 'discord' | 'twitch' | 'pinterest'
  | 'site';

// Адреса, по которым узнаём сервис (с поддоменами: www.youtube.com, m.vk.com …)
const HOSTS: Record<Exclude<LinkService, 'site'>, string[]> = {
  telegram: ['t.me', 'telegram.me', 'telegram.org'],
  whatsapp: ['wa.me', 'whatsapp.com'],
  youtube: ['youtube.com', 'youtu.be'],
  vk: ['vk.com', 'vk.ru', 'vkontakte.ru'],
  threads: ['threads.net', 'threads.com'],
  instagram: ['instagram.com'],
  max: ['max.ru'],
  github: ['github.com', 'github.io'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  linkedin: ['linkedin.com'],
  behance: ['behance.net'],
  dribbble: ['dribbble.com'],
  discord: ['discord.com', 'discord.gg'],
  twitch: ['twitch.tv'],
  pinterest: ['pinterest.com', 'pin.it'],
};

// Добавляет https://, если схемы нет; возвращает null, если это не похоже на адрес
export function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (text === '' || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  if (!/^https?:\/\//i.test(withScheme)) return null;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function detectService(raw: string): LinkService {
  const url = normalizeLink(raw);
  if (!url) return 'site';
  const host = new URL(url).hostname.toLowerCase();
  for (const [service, domains] of Object.entries(HOSTS)) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return service as LinkService;
  }
  return 'site';
}

export const SERVICE_LABEL: Record<LinkService, string> = {
  telegram: 'Telegram', whatsapp: 'WhatsApp', youtube: 'YouTube', vk: 'ВКонтакте', threads: 'Threads', instagram: 'Instagram',
  max: 'MAX', github: 'GitHub', tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', behance: 'Behance', dribbble: 'Dribbble',
  discord: 'Discord', twitch: 'Twitch', pinterest: 'Pinterest', site: 'Сайт',
};
