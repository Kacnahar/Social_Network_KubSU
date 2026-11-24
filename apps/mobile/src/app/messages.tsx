import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../ui/BackButton';
import { MessageIcon } from '../ui/icons';
import { type, useColors } from '../ui/theme';

// Экран «Сообщения» (заглушка): личных сообщений в проекте пока нет, это только место под них.
// Выезжает справа, закрывается стрелкой или свайпом от левого края
export default function MessagesScreen() {
  const router = useRouter();
  const colors = useColors();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.bar}>
          <BackButton inline onPress={back} />
          <Text accessibilityRole="header" style={[type.headline, styles.title, { color: colors.textPrimary }]}>
            Сообщения
          </Text>
          <View style={styles.space} />
        </View>
        <View style={styles.empty}>
          <MessageIcon color={colors.textSecondary} size={44} />
          <Text style={[type.subhead, styles.text, { color: colors.textSecondary }]}>Здесь будут ваши личные сообщения</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 20 },
  title: { flex: 1, textAlign: 'center' },
  space: { width: 44 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  text: { textAlign: 'center' },
});
