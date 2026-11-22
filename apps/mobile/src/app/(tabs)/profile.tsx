import { can } from '@app/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { pausedUntilText } from '../../lib/banText';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, ListScreen, Screen, useTabBarSpace } from '../../ui/components';
import { Emblem } from '../../ui/Emblem';
import { IconButton } from '../../ui/IconButton';
import { GearIcon } from '../../ui/icons';
import { ProfileBody } from '../../ui/ProfileBody';
import { type, useColors } from '../../ui/theme';

// Свой профиль. Выход и удаление аккаунта — в настройках (шестерёнка)
export default function MyProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut, refreshAccount } = useSession();
  const { profile, account } = useSignedIn();
  const tabBarSpace = useTabBarSpace();
  const [shareNote, setShareNote] = useState(false);
  const [leaving, setLeaving] = useState<'/register' | '/login' | null>(null);

  // Бан могли выдать или снять, пока приложение открыто
  useFocusEffect(
    useCallback(() => {
      void refreshAccount();
    }, [refreshAccount]),
  );

  if (!profile) return null;

  const settings = (
    <View style={styles.bar}>
      <IconButton label="Настройки" onPress={() => router.push('/profile/settings')}>
        <GearIcon color={colors.text} />
      </IconButton>
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
        onAddPhoto={() => router.push('/profile/edit')}
        actions={
          <View style={styles.actionsWrap}>
            {account.status === 'banned' ? <Body muted>{pausedUntilText(account.bannedUntil)}</Body> : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button size="compact" variant="secondary" title="Редактировать профиль" onPress={() => router.push('/profile/edit')} />
              </View>
              <View style={styles.actionSmall}>
                <Button size="compact" variant="secondary" title="Поделиться" onPress={() => void share()} />
              </View>
            </View>
            {shareNote ? <Text style={[type.footnote, { color: colors.muted }]}>Поделиться с этого устройства пока нельзя</Text> : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -8 },
  actionsWrap: { gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1.75 },
  actionSmall: { flex: 1 },
  // Как на стартовом экране: знак и текст по центру, действия — внизу, над панелью вкладок
  guest: { flex: 1, paddingTop: 20 },
  guestHero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  guestTitle: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  guestActions: { gap: 4 },
  center: { textAlign: 'center' },
});
