import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, ListScreen } from '../ui/components';
import { Emblem } from '../ui/Emblem';
import { type, useColors } from '../ui/theme';

// Стартовый экран до входа: знак и название сверху, действия — внизу, под большой палец
export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [guestNote, setGuestNote] = useState(false);

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
          {guestNote ? (
            <View accessibilityLiveRegion="polite" style={styles.note}>
              <Body muted>
                Вход без регистрации скоро появится. Пока можно зарегистрироваться — это займёт минуту.
              </Body>
            </View>
          ) : null}
          <Button title="Регистрация" onPress={() => router.push('/register')} />
          <Button variant="secondary" title="Продолжить как гость" onPress={() => setGuestNote(true)} />
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
  note: { paddingHorizontal: 4, paddingBottom: 4 },
});
