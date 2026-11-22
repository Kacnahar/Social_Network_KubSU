import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { FeedList } from '../../features/feed/FeedList';
import { useSignedIn } from '../../lib/session';
import { ListScreen, Title } from '../../ui/components';
import { PlusIcon } from '../../ui/icons';
import { useColors } from '../../ui/theme';

// Главный экран: шапка с «+», истории и лента. Про голосовые комнаты здесь ничего нет — они во вкладке «Войс»
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
            {/* Гость публиковать не может — кнопки у него нет. «+» открывает новый пост, выезжающий снизу */}
            {can(account.role, 'publish') ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Новый пост"
                hitSlop={8}
                onPress={() => router.push('/compose')}
                style={({ pressed }) => [styles.plus, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
              >
                <PlusIcon color={colors.accent} />
              </Pressable>
            ) : null}
          </View>
        }
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
