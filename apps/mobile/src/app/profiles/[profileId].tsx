import type { Profile } from '@app/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, getProfileById } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../../ui/components';
import { ProfileView } from '../../ui/ProfileView';
import { ProfilePosts } from '../../features/posts/ProfilePosts';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile };

export default function ProfileByIdScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { forgetSession } = useSession();
  const { token, profile: mine } = useSignedIn();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
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

  if (isMine && mine) {
    return (
      <Screen align="top">
        <ProfileView profile={mine} />
        <Button variant="secondary" title="Редактировать" onPress={() => router.push('/profile/edit')} />
        <ProfilePosts profileId={mine.profileId} />
        <Button variant="plain" title="Назад" onPress={back} />
      </Screen>
    );
  }
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'ready') {
    return (
      <Screen align="top">
        <ProfileView profile={state.profile} />
        <ProfilePosts profileId={state.profile.profileId} />
        <Button variant="plain" title="Назад" onPress={back} />
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
