import { can } from '@app/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { pausedUntilText } from '../../lib/banText';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, ListScreen, Screen, useTabBarSpace } from '../../ui/components';
import { Emblem } from '../../ui/Emblem';
import { Popover, PopoverItem, type Rect } from '../../ui/Popover';
import { CameraIcon, ShareIcon, SlidersIcon, StoryIcon } from '../../ui/icons';
import { ProfileBody } from '../../ui/ProfileBody';
import { radius, type, useColors } from '../../ui/theme';

// Свой профиль. Выход и удаление аккаунта — в настройках (шестерёнка)
export default function MyProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut, refreshAccount } = useSession();
  const { profile, account } = useSignedIn();
  const tabBarSpace = useTabBarSpace();
  const [shareNote, setShareNote] = useState(false);
  const [plusAt, setPlusAt] = useState<Rect | null>(null);
  const [leaving, setLeaving] = useState<'/register' | '/login' | null>(null);

  // Бан могли выдать или снять, пока приложение открыто
  useFocusEffect(
    useCallback(() => {
      void refreshAccount();
    }, [refreshAccount]),
  );

  if (!profile) return null;

  // Только маленькая иконка настроек в правом углу: тонкая линия, без подписи и фона
  const settings = (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Настройки" hitSlop={14} onPress={() => router.push('/settings')} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
        <SlidersIcon color={colors.text} />
      </Pressable>
    </View>
  );

  // Гость: вместо профиля — спокойное приглашение зарегистрироваться. Ни аватара, ни имени, ни списков.
  // Гостевой вход при этом завершается, и открываются те же экраны, что со стартового
  if (!can(account.role, 'publish')) {
    const leave = async (to: '/register' | '/login') => {
      setLeaving(to);
      await signOut();
      router.replace(to);
    };
    return (
      <ListScreen>
        <View style={[styles.guest, { paddingBottom: tabBarSpace + 8 }]}>
          {settings}
          <View style={styles.guestHero}>
            <Emblem size={120} />
            <Text accessibilityRole="header" style={[type.title, styles.guestTitle, { color: colors.text }]}>
              Станьте частью студенческой соцсети
            </Text>
            <Text style={[type.subhead, styles.center, { color: colors.muted }]}>
              Публикуйте посты, общайтесь и находите друзей среди студентов
            </Text>
          </View>
          <View style={styles.guestActions}>
            <Button title="Регистрация" loading={leaving === '/register'} disabled={leaving !== null} onPress={() => void leave('/register')} />
            <Button variant="plain" title="У меня уже есть аккаунт" loading={leaving === '/login'} disabled={leaving !== null} onPress={() => void leave('/login')} />
          </View>
        </View>
      </ListScreen>
    );
  }

  const share = async () => {
    setShareNote(false);
    try {
      await Share.share({ message: `Мой профиль в студенческой соцсети: ${profile.displayName}` });
    } catch {
      setShareNote(true);
    }
  };

  return (
    <Screen align="top">
      {settings}
      <ProfileBody
        profile={profile}
        isMine
        onPlus={setPlusAt}
        actions={
          <View style={styles.actionsWrap}>
            {account.status === 'banned' ? <Body muted>{pausedUntilText(account.bannedUntil)}</Body> : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button size="thin" variant="secondary" title="Редактировать профиль" onPress={() => router.push('/profile/edit')} />
              </View>
              <View style={styles.action}>
                <Button size="thin" variant="secondary" title="Друзья" onPress={() => router.push('/friends')} />
              </View>
              {/* Квадратная кнопка только с иконкой: меню «Поделиться» телефона */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Поделиться профилем"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => void share()}
                style={({ pressed }) => [styles.shareSquare, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
              >
                <ShareIcon color={colors.text} />
              </Pressable>
            </View>
            {shareNote ? <Text style={[type.footnote, { color: colors.muted }]}>Поделиться с этого устройства пока нельзя</Text> : null}
          </View>
        }
      />
      {/* Меню по «+» у аватарки: фото профиля (экран редактирования, где выбирается фото) и история */}
      <Popover visible={plusAt !== null} anchor={plusAt} onClose={() => setPlusAt(null)}>
        <PopoverItem
          first
          title={profile.avatarUrl ? 'Изменить фото профиля' : 'Добавить фото профиля'}
          icon={<CameraIcon color={colors.text} />}
          onPress={() => {
            setPlusAt(null);
            router.push('/profile/edit');
          }}
        />
        <PopoverItem
          title="Добавить историю"
          icon={<StoryIcon color={colors.text} />}
          onPress={() => {
            setPlusAt(null);
            router.navigate({ pathname: '/create', params: { kind: 'story' } });
          }}
        />
      </Popover>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -8 },
  actionsWrap: { gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  shareSquare: { width: 38, height: 38, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  // Как на стартовом экране: знак и текст по центру, действия — внизу, над панелью вкладок
  guest: { flex: 1, paddingTop: 20 },
  guestHero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  guestTitle: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  guestActions: { gap: 4 },
  center: { textAlign: 'center' },
});
