import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Screen, Title } from '../../ui/components';
import { BackButton } from '../../ui/BackButton';
import { IconButton } from '../../ui/IconButton';
import { type, useColors } from '../../ui/theme';

// «Знакомые»: люди, с которыми совпало «хочу пообщаться ещё», и ступени раскрытия.
//
// ВАЖНО. Это макет на выдуманных данных: сервера для отметок и раскрытия нет, и до решения юриста
// и управляющих его делать нельзя (см. docs/ROADMAP.md, часть 2.3). Здесь нет ни одного настоящего
// человека и ни одного запроса к серверу — экран ничего не раскрывает и не связывает ник с профилем.

type Pair = {
  id: string;
  nickname: string;
  // 0 — совпало, ничего не открыто; 1 — факультет, курс, интересы; 2 — имя и соцсеть
  step: 0 | 1 | 2;
  facts: string;
  identity: string;
};

const EXAMPLES: Pair[] = [
  { id: 'e1', nickname: 'Тихий кит', step: 2, facts: 'Журналистика · 3 курс · кино, бег', identity: 'Даша · tg: @example_dasha' },
  { id: 'e2', nickname: 'Северный ветер', step: 1, facts: 'Математика · 2 курс · шахматы, гитара', identity: 'Откроется на второй ступени' },
  { id: 'e3', nickname: 'Мятный чай', step: 0, facts: 'Откроется на первой ступени', identity: 'Откроется на второй ступени' },
];

export default function VoiceFriendsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [pairs, setPairs] = useState(EXAMPLES);
  const [note, setNote] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/voice'));
  const openNext = (id: string) => {
    setPairs((current) => current.map((pair) => (pair.id === id && pair.step < 2 ? { ...pair, step: (pair.step + 1) as 1 | 2 } : pair)));
    setNote(null);
  };

  return (
    <Screen align="top">
      <View style={styles.bar}>
        <BackButton inline onPress={back} />
      </View>
      <View style={styles.heading}>
        <Title>Знакомые</Title>
        <Text style={[type.body, { color: colors.muted }]}>Люди, с которыми совпало «хочу пообщаться ещё»</Text>
      </View>

      <View style={[styles.banner, { backgroundColor: colors.highlightTint }]}>
        <Text style={[type.footnote, styles.bannerText, { color: colors.live }]}>
          Пример. Раздел ещё не работает: ниже выдуманные люди, чтобы показать, как это будет выглядеть
        </Text>
      </View>

      <View>
        {pairs.map((pair) => (
          <View key={pair.id} style={[styles.pair, { borderBottomColor: colors.border }]}>
            <View style={styles.head}>
              <View style={[styles.circle, { backgroundColor: colors.fill }]}>
                <Text style={[type.headline, { color: colors.text }]}>{pair.nickname.charAt(0)}</Text>
              </View>
              <View style={styles.headText}>
                <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
                  {pair.nickname}
                </Text>
                <Text style={[type.footnote, { color: colors.muted }]}>Открыто ступеней: {pair.step} из 2</Text>
              </View>
            </View>

            <Step number={1} title="Факультет, курс, интересы" value={pair.facts} open={pair.step >= 1} />
            <Step number={2} title="Имя и соцсеть" value={pair.identity} open={pair.step >= 2} />

            {pair.step < 2 ? (
              <Button size="compact" variant="secondary" title="Открыть следующую ступень" onPress={() => openNext(pair.id)} />
            ) : (
              <Button size="compact" title="Написать" onPress={() => setNote('Чат появится позже')} />
            )}
            {pair.step < 2 ? (
              <Text style={[type.footnote, { color: colors.muted }]}>Ступень откроется, когда согласятся оба</Text>
            ) : null}
          </View>
        ))}
      </View>
      {note ? (
        <Text accessibilityLiveRegion="polite" style={[type.footnote, styles.center, { color: colors.muted }]}>
          {note}
        </Text>
      ) : null}
    </Screen>
  );
}

function Step({ number, title, value, open }: { number: number; title: string; value: string; open: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, { backgroundColor: open ? colors.primary : colors.fill }]}>
        <Text style={[type.caption, { color: open ? colors.onPrimary : colors.muted }]}>{number}</Text>
      </View>
      <View style={styles.stepText}>
        <Text style={[type.footnote, { color: colors.muted }]}>{title}</Text>
        <Text style={[type.subhead, { color: open ? colors.text : colors.muted }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: -4 },
  heading: { gap: 6 },
  banner: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bannerText: { fontWeight: '600' },
  pair: { gap: 10, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 2 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepText: { flex: 1, gap: 1 },
  center: { textAlign: 'center' },
});
