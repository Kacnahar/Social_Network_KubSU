import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Screen } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

type AfterRoomProps = {
  // Ники тех, кто был в комнате вместе со мной (без меня)
  nicknames: string[];
  onDone: () => void;
};

// После комнаты: «Хотите пообщаться ещё?» — переключатель у каждого ника.
//
// ВАЖНО. Это только внешний вид: сервер отметки пока не принимает. Отметки живут в памяти этого экрана,
// никуда не отправляются и не пишутся в журнал — правило проекта: невзаимные отметки не видит никто.
// Когда появится сервер, отправлять их можно только туда, где невзаимную отметку не увидит ни админ, ни лог.
export function AfterRoom({ nicknames, onDone }: AfterRoomProps) {
  const colors = useColors();
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const count = Object.values(marked).filter(Boolean).length;

  if (nicknames.length === 0) {
    return (
      <Screen>
        <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
          Комната закончилась
        </Text>
        <Text style={[type.body, { color: colors.muted }]}>Спасибо, что были с нами. Загляните в следующий раз.</Text>
        <Button title="К комнатам" onPress={onDone} />
      </Screen>
    );
  }

  return (
    <Screen align="top">
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
          Хотите пообщаться ещё?
        </Text>
        <Text style={[type.body, { color: colors.muted }]}>Отметьте тех, с кем было интересно</Text>
      </View>

      <View>
        {nicknames.map((nickname) => (
          <View key={nickname} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.circle, { backgroundColor: colors.fill }]}>
              <Text style={[type.headline, { color: colors.text }]}>{nickname.charAt(0).toUpperCase()}</Text>
            </View>
            <Text numberOfLines={1} style={[type.body, styles.name, { color: colors.text }]}>
              {nickname}
            </Text>
            <Switch
              accessibilityLabel={`Пообщаться ещё: ${nickname}`}
              value={marked[nickname] ?? false}
              onValueChange={(value) => setMarked((current) => ({ ...current, [nickname]: value }))}
              trackColor={{ false: colors.fill, true: colors.accent }}
              thumbColor={colors.card}
            />
          </View>
        ))}
      </View>

      <View style={[styles.note, { backgroundColor: colors.fill }]}>
        <Text style={[type.subhead, styles.noteTitle, { color: colors.text }]}>Никто не узнает, если не взаимно</Text>
        <Text style={[type.footnote, { color: colors.muted }]}>
          Человек увидит вашу отметку, только если тоже отметит вас. Отметить можно в течение 24 часов после комнаты.
        </Text>
      </View>

      <Button title={count > 0 ? `Готово · отмечено ${count}` : 'Готово'} onPress={onDone} />
      <Text style={[type.footnote, styles.stub, { color: colors.muted }]}>
        Раздел в разработке: отметки пока не сохраняются
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1 },
  note: { borderRadius: 20, padding: 16, gap: 4 },
  noteTitle: { fontWeight: '600' },
  stub: { textAlign: 'center' },
});
