import { can, type Profile } from '@app/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { ApiError, getProfileById } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../../ui/components';
import { BackButton } from '../../ui/BackButton';
import { FlagIcon, ShareIcon } from '../../ui/icons';
import { MoreButton } from '../../ui/MoreButton';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../ui/Popover';
import { ProfileBody } from '../../ui/ProfileBody';
import { type, useColors } from '../../ui/theme';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile };

export default function ProfileByIdScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { forgetSession } = useSession();
  const colors = useColors();
  const { token, profile: mine, account } = useSignedIn();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Меню «⋯» открывается от кнопки, как меню «+» у аватарки в своём профиле
  const menuAnchor = useAnchor();
  const [menuAt, setMenuAt] = useState<Rect | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const isMine = mine !== null && mine.profileId === profileId;

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', profile: await getProfileById(token, profileId) });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') await forgetSession();
      else if (caught instanceof ApiError && caught.code === 'not_found') setState({ status: 'missing' });
      else setState({ status: 'error', message: caught instanceof Error ? caught.message : 'Что-то пошло не так' });
    }
  }, [token, profileId, forgetSession]);

  useEffect(() => {
    if (!isMine) void load();
  }, [isMine, load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Свой профиль — это вкладка «Профиль»
  if (isMine) return <Redirect href="/profile" />;
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'ready') {
    const profile = state.profile;
    // Гость только смотрит: дружить и писать он не может
    const canAct = can(account.role, 'react');

    const share = async () => {
      setNote(null);
      try {
        await Share.share({ message: `Профиль в студенческой соцсети: ${profile.displayName}` });
      } catch {
        setNote('Поделиться с этого устройства пока нельзя');
      }
    };

    return (
      <Screen align="top">
        <View style={styles.bar}>
          <BackButton inline onPress={back} />
          <MoreButton label="Ещё действия" anchorRef={menuAnchor.ref} onPress={() => menuAnchor.measure(setMenuAt)} />
        </View>
        <Popover visible={menuAt !== null} anchor={menuAt} onClose={() => setMenuAt(null)}>
          <PopoverItem
            first
            title="Поделиться"
            icon={<ShareIcon color={colors.textPrimary} />}
            onPress={() => {
              setMenuAt(null);
              void share();
            }}
          />
          <PopoverItem
            danger
            title="Пожаловаться"
            icon={<FlagIcon color={colors.danger} />}
            onPress={() => {
              setMenuAt(null);
              setNote('Жалобы на профиль скоро появятся. Пока можно пожаловаться на пост — через «…» у поста');
            }}
          />
        </Popover>

        <ProfileBody
          profile={profile}
          isMine={false}
          actions={
            <View style={styles.actionsWrap}>
              {canAct ? (
                <View style={styles.actions}>
                  <View style={styles.action}>
                    <Button size="thin" title="Добавить в друзья" onPress={() => setNote('Друзья скоро появятся')} />
                  </View>
                  <View style={styles.actionSmall}>
                    <Button size="thin" variant="secondary" title="Написать" onPress={() => setNote('Личные сообщения скоро появятся')} />
                  </View>
                </View>
              ) : null}
              {note ? (
                <Text accessibilityLiveRegion="polite" style={[type.footnote, { color: colors.muted }]}>
                  {note}
                </Text>
              ) : null}
            </View>
          }
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>{state.status === 'missing' ? 'Такого профиля нет' : 'Не получилось загрузить'}</Title>
      {state.status === 'error' ? <Body muted>{state.message}</Body> : null}
      {state.status === 'error' ? <Button title="Попробовать ещё раз" onPress={() => void load()} /> : null}
      <Button variant={state.status === 'error' ? 'plain' : 'primary'} title="Назад" onPress={back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: -4 },
  actionsWrap: { gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  actionSmall: { flex: 1 },
});
