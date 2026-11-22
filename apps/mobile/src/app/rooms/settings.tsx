import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePersona } from '../../features/rooms/usePersona';
import { useSession, useSignedIn } from '../../lib/session';
import { Button, Screen, Title } from '../../ui/components';
import { IconButton } from '../../ui/IconButton';
import { PushCard } from '../../ui/PushCard';
import { radius, type, useColors } from '../../ui/theme';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

// Настройки войса: свой ник в комнатах, его смена (раз в месяц) и напоминания.
// Здесь только данные комнат: профиля соцсети на этом экране нет и быть не должно
export default function VoiceSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { forgetSession } = useSession();
  const { token } = useSignedIn();
  const { status, persona, reload } = usePersona(token, () => void forgetSession());

  // После смены ника возвращаемся сюда — показываем новый
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reload();
    }, [reload]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/voice'));
  const changeAt = persona?.nicknameChangeAvailableAt ? new Date(persona.nicknameChangeAvailableAt) : null;
  const hasNickname = persona !== null && persona.nickname !== null;
  const canChange = hasNickname && (changeAt === null || changeAt.getTime() <= Date.now());

  return (
    <Screen align="top">
      <View style={styles.bar}>
        <IconButton label="Назад" onPress={back}>
          <View style={[styles.chevron, { borderColor: colors.text }]} />
        </IconButton>
      </View>
      <Title>Настройки войса</Title>

      <View style={[styles.card, { backgroundColor: colors.fill }]}>
        <Text style={[type.footnote, styles.label, { color: colors.muted }]}>Ваш ник в комнатах</Text>
        {status === 'loading' ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
        {status === 'error' ? <Button variant="secondary" title="Не загрузилось. Повторить" onPress={reload} /> : null}
        {persona ? (
          <>
            <Text style={[type.title, styles.nickname, { color: colors.text }]}>{persona.nickname ?? 'Ника пока нет'}</Text>
            <Text style={[type.subhead, { color: colors.muted }]}>
              В комнате вас видят только под ником. Имя, фото и профиль собеседники не узнают.
            </Text>
            {!hasNickname ? <Button title="Придумать ник" onPress={() => router.push('/rooms/nickname')} /> : null}
            {canChange ? <Button variant="secondary" title="Сменить ник" onPress={() => router.push('/rooms/nickname')} /> : null}
            {hasNickname && !canChange && changeAt ? (
              <Text style={[type.footnote, { color: colors.muted }]}>
                Ник можно менять раз в месяц. Следующая смена — {dateFormat.format(changeAt)}
              </Text>
            ) : null}
            {canChange ? <Text style={[type.footnote, { color: colors.muted }]}>Ник можно менять раз в месяц</Text> : null}
          </>
        ) : null}
      </View>

      <PushCard token={token} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  card: { borderRadius: radius.card, borderCurve: 'continuous', padding: 20, gap: 10 },
  label: { fontWeight: '600' },
  spinner: { alignSelf: 'flex-start' },
  nickname: { fontSize: 26, lineHeight: 32 },
});
