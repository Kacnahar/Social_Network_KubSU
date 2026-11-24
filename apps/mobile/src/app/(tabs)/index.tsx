import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FeedList } from '../../features/feed/FeedList';
import { useSignedIn } from '../../lib/session';
import { ListScreen, Title } from '../../ui/components';
import { MessagesButton } from '../../ui/MessagesButton';
import { PlusButton } from '../../ui/PlusButton';
import { showToast } from '../../ui/toastStore';
import { useColors } from '../../ui/theme';

// Главный экран: шапка с «+» и сообщениями, истории и лента. Про голосовые комнаты здесь ничего нет — они во вкладке «Войс»
export default function FeedScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  return (
    <ListScreen>
      <FeedList
        header={
          <View style={styles.header}>
            <Title>Лента</Title>
            {/* Справа: «+» (новый пост, выезжает снизу; гостю его нет) и сообщения (крайняя справа; гостю — предложение зарегистрироваться) */}
            <View style={styles.actions}>
              {can(account.role, 'publish') ? <PlusButton label="Новый пост" onPress={() => router.push('/compose')} /> : null}
              <MessagesButton onPress={() => (account.role === 'guest' ? showToast('Зарегистрируйтесь, чтобы писать сообщения') : router.push('/messages'))} />
            </View>
          </View>
        }
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
