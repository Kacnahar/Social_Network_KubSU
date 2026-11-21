import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchHealth } from '../lib/api';

type ServerState =
  | { kind: 'checking' }
  | { kind: 'online'; version: string }
  | { kind: 'offline' };

const palette = {
  light: { background: '#F6F5F2', text: '#1B1B1F', muted: '#6B6B76', card: '#FFFFFF', accent: '#3D5AFE' },
  dark: { background: '#121216', text: '#F2F2F5', muted: '#9A9AA6', card: '#1D1D24', accent: '#8C9EFF' },
};

const STATUS_COLOR = { online: '#2E9E5B', offline: '#D64545' };

export default function HomeScreen() {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [server, setServer] = useState<ServerState>({ kind: 'checking' });

  const check = useCallback(async () => {
    setServer({ kind: 'checking' });
    try {
      const health = await fetchHealth();
      setServer({ kind: 'online', version: health.version });
    } catch {
      setServer({ kind: 'offline' });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Комнаты</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Каркас приложения. Здесь появятся вход и расписание комнат.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {server.kind === 'checking' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.status, { color: colors.text }]}>Проверяем связь с сервером…</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLOR[server.kind] }]} />
              <Text style={[styles.status, { color: colors.text }]}>
                {server.kind === 'online'
                  ? `Сервер на связи (версия ${server.version})`
                  : 'Нет связи с сервером'}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={server.kind === 'checking'}
            onPress={check}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent, opacity: pressed || server.kind === 'checking' ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Проверить ещё раз</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22 },
  card: { marginTop: 16, padding: 20, borderRadius: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  status: { fontSize: 16, flexShrink: 1 },
  button: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
