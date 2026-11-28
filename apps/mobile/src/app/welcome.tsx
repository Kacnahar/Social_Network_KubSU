import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { authGuest } from '../lib/api';
import { useSession } from '../lib/session';
import { Button, ErrorText, ListScreen } from '../ui/components';
import { Emblem } from '../ui/Emblem';
import { type, useColors } from '../ui/theme';

// Стартовый экран до входа: знак и название сверху, действия — внизу, под большой палец
export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signIn } = useSession();
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Гость входит без почты: сервер выдаёт сессию «только просмотр»
  const enterAsGuest = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await signIn(await authGuest());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setGuestLoading(false);
    }
  };

  return (
    <ListScreen>
      <View style={styles.page}>
        <View style={styles.hero}>
          <Emblem />
          <Text accessibilityRole="header" style={[type.largeTitle, styles.center, { color: colors.text }]}>
            Студенческая соцсеть
          </Text>
          <Text style={[type.body, styles.center, { color: colors.muted }]}>
            Лента, истории и анонимные голосовые комнаты для своих
          </Text>
        </View>

        <View style={styles.actions}>
          <ErrorText>{error}</ErrorText>
          <Button title="Регистрация" onPress={() => router.push('/register')} />
          <Button variant="secondary" title="Продолжить как гость" onPress={() => void enterAsGuest()} loading={guestLoading} />
          <Button
            variant="plain"
            title="У меня уже есть аккаунт"
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 28, paddingBottom: 12 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  center: { textAlign: 'center' },
  actions: { gap: 12 },
});
