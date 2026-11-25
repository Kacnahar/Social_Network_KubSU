import { can } from '@app/shared';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryComposer } from '../../features/stories/StoryComposer';
import { pausedBodyText } from '../../lib/banText';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Screen } from '../../ui/components';
import { BackButton } from '../../ui/BackButton';
import { type, useColors } from '../../ui/theme';

// Новая история: отдельный экран (раньше был в «Создать»). Открывается кружком «Ваша история» в ленте
// и пунктом «Добавить историю» в меню «+» у аватарки в профиле. Гость историю не создаёт
export default function NewStoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const { refreshAccount } = useSession();

  // Бан могли выдать, пока приложение открыто
  useFocusEffect(
    useCallback(() => {
      void refreshAccount();
    }, [refreshAccount]),
  );

  if (!can(account.role, 'publish')) return <Redirect href="/" />;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen align="top">
      <View style={styles.bar}>
        <BackButton inline onPress={back} />
        <Text accessibilityRole="header" style={[type.headline, styles.title, { color: colors.textPrimary }]}>
          {account.status === 'banned' ? 'Публикации на паузе' : 'Новая история'}
        </Text>
        <View style={styles.space} />
      </View>
      {account.status === 'banned' ? (
        <>
          <Body>{pausedBodyText(account.bannedUntil)}</Body>
          <Body muted>Если считаете это ошибкой, напишите организаторам</Body>
        </>
      ) : (
        <StoryComposer />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, textAlign: 'center' },
  space: { width: 44 },
});
