import { can } from '@app/shared';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StoryComposer } from '../../features/stories/StoryComposer';
import { pausedBodyText } from '../../lib/banText';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Screen } from '../../ui/components';
import { ScreenBar } from '../../ui/ScreenBar';

// Новая история: отдельный экран (раньше был в «Создать»). Открывается кружком «Ваша история» в ленте
// и пунктом «Добавить историю» в меню «+» у аватарки в профиле. Гость историю не создаёт
export default function NewStoryScreen() {
  const router = useRouter();
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
      <ScreenBar title={account.status === 'banned' ? 'Публикации на паузе' : 'Новая история'} onBack={back} />
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
