import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, authStart, authVerify, getAccount, getProfile, updateProfile } from '../../lib/api';
import { setNickname } from '../../ui/nicknameStore';
import { addComment, createPost } from '../posts/api';
import { ALL_TEST_ACCOUNTS, TEST_ACCOUNTS, findTestAccount, type TestAccount } from './testAccounts';

// ТОЛЬКО для разработки. Входит под тестовым аккаунтом настоящим входом на локальном сервере разработки:
// сервер в режиме разработки сам выдаёт код, приложение его подставляет. Токены тестовых аккаунтов запоминаются,
// поэтому переключение между ними мгновенное, без ввода кода.

const KEY = 'dev.testSessions';
type Record = { token: string; seeded: boolean };
type Store = { [email: string]: Record };

async function read(): Promise<Store> {
  try {
    const text = Platform.OS === 'web' ? (globalThis.localStorage?.getItem(KEY) ?? null) : await SecureStore.getItemAsync(KEY);
    return text ? (JSON.parse(text) as Store) : {};
  } catch {
    return {};
  }
}

async function write(store: Store): Promise<void> {
  try {
    const text = JSON.stringify(store);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, text);
    else await SecureStore.setItemAsync(KEY, text);
  } catch {
    // Не запомнилось — войдёт заново
  }
}

export const readTestSessions = read;

// Токен тестового аккаунта: сохранённый, если он ещё действует, иначе новый вход (или регистрация) с автоподстановкой кода
export async function ensureTestSession(account: TestAccount): Promise<string> {
  const store = await read();
  const saved = store[account.email];
  if (saved) {
    try {
      await getAccount(saved.token);
      // Профиль мог не создаться (например, сервер перезапускали) — создаём, чтобы приложение не просило его заполнить
      if (account.profile && !(await getProfile(saved.token))) await updateProfile(saved.token, account.profile);
      return saved.token;
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.code === 'unauthorized')) throw caught;
    }
  }

  // Сервер ограничивает отправку кода одним разом в минуту на почту, поэтому запрос один. С кодом приглашения он работает
  // и для нового аккаунта (создастся), и для уже существующего (просто войдёт). Если код приглашения исчерпан — обычный вход
  let start: { devCode?: string };
  try {
    start = await authStart({ email: account.email, inviteCode: account.inviteCode });
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'too_many_requests') throw caught;
    start = await authStart({ email: account.email });
  }
  if (!start.devCode) throw new Error('Сервер не в режиме разработки: код для тестового аккаунта не выдан');
  const token = await authVerify(account.email, start.devCode);

  if (account.profile) {
    const existing = await getProfile(token);
    const profile = existing ?? (await updateProfile(token, account.profile));
    if (account.nick) setNickname(profile.profileId, account.nick);
  }
  store[account.email] = { token, seeded: false };
  await write(store);
  return token;
}

// Тестовые посты и комментарии друг другу: создаются один раз на каждый аккаунт
export async function seedTestContent(): Promise<void> {
  const tokens = new Map<string, string>();
  for (const account of TEST_ACCOUNTS) tokens.set(account.email, await ensureTestSession(account));
  const store = await read();
  const postIds = new Map<string, string[]>();

  for (const account of TEST_ACCOUNTS) {
    const token = tokens.get(account.email);
    if (!token || store[account.email]?.seeded) continue;
    const ids: string[] = [];
    for (const text of account.posts) ids.push((await createPost(token, { text, photoMediaIds: [] })).postId);
    postIds.set(account.email, ids);
  }

  // Каждый комментирует первый пост следующего по кругу
  for (const [index, account] of TEST_ACCOUNTS.entries()) {
    const token = tokens.get(account.email);
    const other = TEST_ACCOUNTS[(index + 1) % TEST_ACCOUNTS.length];
    const target = other ? postIds.get(other.email)?.[0] : undefined;
    if (!token || !target) continue;
    for (const text of account.comments) await addComment(token, target, text);
  }

  const fresh = await read();
  for (const account of TEST_ACCOUNTS) {
    const record = fresh[account.email];
    if (record) record.seeded = true;
  }
  await write(fresh);
}

// Вход по почте с экрана «У меня уже есть аккаунт»: возвращает токен, если почта тестовая, иначе null
export async function devLoginToken(email: string): Promise<string | null> {
  const account = findTestAccount(email);
  if (!account) return null;
  const token = await ensureTestSession(account);
  // Посты и комментарии создаём в фоне, вход они не задерживают
  void seedTestContent().catch(() => undefined);
  return token;
}

export const isTestEmail = (email: string): boolean => findTestAccount(email) !== null;
export { ALL_TEST_ACCOUNTS };
