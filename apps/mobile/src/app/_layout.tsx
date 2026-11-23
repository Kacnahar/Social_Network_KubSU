import { can } from '@app/shared';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../ui/components';
import { useScheme } from '../ui/theme';
import { ToastHost } from '../ui/ToastHost';

function Navigation() {
  const { state, retry } = useSession();

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'offline') {
    return (
      <Screen>
        <Title>Нет связи</Title>
        <Body muted>Не получилось связаться с сервером. Проверьте интернет и попробуйте ещё раз.</Body>
        <Button title="Попробовать ещё раз" onPress={retry} />
      </Screen>
    );
  }

  const signedIn = state.status === 'signedIn';
  const hasProfile = signedIn && state.profile !== null;
  const canUseRooms = signedIn && can(state.account.role, 'rooms');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="register" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasProfile}>
        <Stack.Screen name="profile/setup" />
      </Stack.Protected>
      {/* Невошедшего с главного адреса ведём на стартовый экран, а не на форму */}
      <Stack.Protected guard={hasProfile} redirectTo={signedIn ? '/profile/setup' : '/welcome'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="friends" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/[item]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profiles/[profileId]" />
        <Stack.Screen name="posts/[postId]" />
        <Stack.Screen name="catalog/[section]" />
        <Stack.Screen name="catalog/schedule" />
        <Stack.Screen name="ad/[adId]" />
        <Stack.Screen name="ad/new" />
        {/* Новый пост выезжает снизу поверх ленты */}
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="stories/[profileId]" />
        <Stack.Screen name="admin/index" />
      </Stack.Protected>
      <Stack.Protected guard={hasProfile && canUseRooms}>
        <Stack.Screen name="rooms/nickname" />
        <Stack.Screen name="rooms/call" />
        <Stack.Screen name="rooms/settings" />
        <Stack.Screen name="rooms/friends" />
      </Stack.Protected>
    </Stack>
  );
}

// Значки в верхней строке телефона следуют выбранной теме, а не только системной
function ThemedStatusBar() {
  return <StatusBar style={useScheme() === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <Navigation />
      <ThemedStatusBar />
      <ToastHost />
    </SessionProvider>
  );
}
