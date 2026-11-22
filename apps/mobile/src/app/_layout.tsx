import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../lib/session';
import { Body, Button, LoadingScreen, Screen, Title } from '../ui/components';

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
  const hasNickname = signedIn && state.me.nickname !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasNickname}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="nickname" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <Navigation />
      <StatusBar style="auto" />
    </SessionProvider>
  );
}
