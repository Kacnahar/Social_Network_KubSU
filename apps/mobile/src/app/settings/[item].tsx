import { can } from '@app/shared';
import Constants from 'expo-constants';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteAccount } from '../../lib/api';
import { disablePush } from '../../lib/push';
import { useSession, useSignedIn } from '../../lib/session';
import { BackButton } from '../../ui/BackButton';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Body, Button, ErrorText, Screen, Title } from '../../ui/components';
import { PushCard } from '../../ui/PushCard';
import { SoundBody } from '../../ui/SoundBody';
import { LikedPosts } from '../../features/posts/LikedPosts';
import { THEME_CHOICES } from '../../ui/themeChoice';
import { useThemeChoice, setThemeChoice } from '../../ui/themeStore';
import { CheckIcon } from '../../ui/icons';
import { radius, type, useColors } from '../../ui/theme';

const TITLES: Record<string, string> = {
  account: 'Аккаунт',
  liked: 'Мне нравится',
  notifications: 'Уведомления',
  sound: 'Звук',
  privacy: 'Конфиденциальность и безопасность',
  blocked: 'Заблокированные',
  language: 'Язык',
  theme: 'Тема',
  help: 'Помощь и поддержка',
  about: 'О приложении',
};

// У гостя из всех пунктов только язык и тема
const GUEST_ITEMS = ['language', 'theme'];

// Один экран на каждый пункт настроек. «Тема» работает по-настоящему; «Язык» показывает единственный язык;
// «Аккаунт» держит удаление аккаунта; «Уведомления» — готовую карточку напоминаний; остальные — заглушки
export default function SettingsItemScreen() {
  const router = useRouter();
  const colors = useColors();
  const { item } = useLocalSearchParams<{ item?: string }>();
  const { account } = useSignedIn();
  const title = item ? TITLES[item] : undefined;
  if (!item || !title) return <Redirect href="/settings" />;
  if (!can(account.role, 'publish') && !GUEST_ITEMS.includes(item)) return <Redirect href="/settings" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <Screen align="top">
      <BackButton onPress={back} />
      <Title>{title}</Title>
      <ItemBody item={item} />
    </Screen>
  );
}

function ItemBody({ item }: { item: string }) {
  if (item === 'theme') return <ThemeBody />;
  if (item === 'language') return <LanguageBody />;
  if (item === 'account') return <AccountBody />;
  if (item === 'liked') return <LikedPosts />;
  if (item === 'sound') return <SoundBody />;
  if (item === 'notifications') return <NotificationsBody />;
  if (item === 'about') return <AboutBody />;
  return <Soon text={item === 'help' ? 'Здесь появятся ответы на вопросы и связь с поддержкой' : item === 'blocked' ? 'Здесь будет список людей, которых вы заблокировали' : 'Здесь появятся настройки приватности и безопасности'} />;
}

function Soon({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.soon}>
      <View style={[styles.pill, { backgroundColor: colors.highlightTint }]}>
        <Text style={[type.subhead, styles.pillText, { color: colors.live }]}>Скоро</Text>
      </View>
      <Text style={[type.body, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

// Строка выбора с галочкой справа: для темы и языка
function Choice({ title, selected, onPress, disabled = false, note }: { title: string; selected: boolean; onPress?: () => void; disabled?: boolean; note?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={note ? `${title}. ${note}` : title}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { borderBottomColor: colors.border, opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }]}
    >
      <View style={styles.choiceText}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {note ? <Text style={[type.footnote, { color: colors.muted }]}>{note}</Text> : null}
      </View>
      {selected ? <CheckIcon color={colors.accent} /> : null}
    </Pressable>
  );
}

function ThemeBody() {
  const choice = useThemeChoice();
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {THEME_CHOICES.map((item) => (
        <Choice key={item.value} title={item.label} selected={choice === item.value} onPress={() => setThemeChoice(item.value)} />
      ))}
    </View>
  );
}

function LanguageBody() {
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      <Choice title="Русский" selected />
      <Choice title="English" selected={false} disabled note="Скоро" />
    </View>
  );
}

function NotificationsBody() {
  const { token } = useSignedIn();
  return <PushCard token={token} />;
}

function AboutBody() {
  const colors = useColors();
  const version = Constants.expoConfig?.version ?? '0.0.0';
  return (
    <View style={styles.list}>
      <View style={[styles.about, { borderBottomColor: colors.border }]}>
        <Text style={[type.body, { color: colors.text }]}>Версия</Text>
        <Text style={[type.body, { color: colors.muted }]}>{version}</Text>
      </View>
      <Body muted>Студенческая соцсеть: лента, каталог и анонимные голосовые комнаты</Body>
    </View>
  );
}

// Удаление аккаунта: раньше жило прямо в настройках, теперь здесь, с тем же подтверждением
function AccountBody(): ReactNode {
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(token);
      await disablePush(null);
      await forgetSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <View style={styles.account}>
      <Soon text="Здесь появятся личные данные и почта" />
      <ErrorText>{error}</ErrorText>
      <View style={styles.deleteWrap}>
        <Button variant="plainDanger" title="Удалить аккаунт" onPress={() => setConfirming(true)} disabled={busy} />
      </View>
      <ConfirmDialog
        visible={confirming}
        title="Удалить аккаунт?"
        message="Профиль, фото и все данные исчезнут навсегда. Отменить это нельзя"
        confirmTitle="Удалить"
        danger
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  account: { gap: 14, alignItems: 'stretch' },
  soon: { gap: 14, alignItems: 'flex-start' },
  pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontWeight: '600' },
  deleteWrap: { marginTop: 24 },
  list: { marginHorizontal: -20 },
  choice: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  choiceText: { flex: 1, gap: 1 },
  about: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 14 },
});
