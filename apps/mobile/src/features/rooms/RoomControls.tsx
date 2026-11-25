import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useColors } from '../../ui/theme';
import { MicButton } from './MicButton';

type RoomControlsProps = {
  micEnabled: boolean;
  micBusy: boolean;
  micBlocked: boolean;
  micNote: string | null;
  onToggleMic: () => void;
  handRaised: boolean;
  onToggleHand: () => void;
  onLeave: () => void;
};

// Нижняя панель комнаты: поднять руку, микрофон (крупнее и по центру), выйти
export function RoomControls({ micEnabled, micBusy, micBlocked, micNote, onToggleMic, handRaised, onToggleHand, onLeave }: RoomControlsProps) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Side label={handRaised ? 'Опустить руку' : 'Поднять руку'} caption={handRaised ? 'Рука поднята' : 'Рука'} active={handRaised} onPress={onToggleHand}>
          <Text style={styles.emoji}>✋</Text>
        </Side>
        <MicButton enabled={micEnabled} busy={micBusy} onPress={onToggleMic} disabled={micBlocked} note={micNote} />
        <Side label="Выйти из комнаты" caption="Выйти" danger onPress={onLeave}>
          {/* Дверь со стрелкой наружу */}
          <View style={[styles.door, { borderColor: colors.danger }]} />
          <View style={[styles.arrowStem, { backgroundColor: colors.danger }]} />
          <View style={[styles.arrowHead, { borderColor: colors.danger }]} />
        </Side>
      </View>
      {handRaised ? (
        <Text accessibilityLiveRegion="polite" style={[type.footnote, styles.note, { color: colors.muted }]}>
          Пока поднятую руку видите только вы
        </Text>
      ) : null}
    </View>
  );
}

type SideProps = { label: string; caption: string; active?: boolean; danger?: boolean; onPress: () => void; children: ReactNode };

function Side({ label, caption, active = false, danger = false, onPress, children }: SideProps) {
  const colors = useColors();
  return (
    <View style={styles.side}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: danger ? colors.dangerTint : active ? colors.highlightTint : colors.fill, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {children}
      </Pressable>
      <Text style={[type.subhead, { color: danger ? colors.danger : colors.muted }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  // Подпись под микрофоном бывает в две строки, поэтому кнопки выровнены по верху
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  side: { width: 84, alignItems: 'center', gap: 12, paddingTop: 12 },
  button: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26, lineHeight: 32 },
  door: { position: 'absolute', left: 19, width: 14, height: 24, borderWidth: 2.5, borderRightWidth: 0, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  arrowStem: { position: 'absolute', left: 28, width: 16, height: 2.5, borderRadius: 1.5 },
  arrowHead: { position: 'absolute', left: 36, width: 9, height: 9, borderTopWidth: 2.5, borderRightWidth: 2.5, transform: [{ rotate: '45deg' }] },
  note: { textAlign: 'center' },
});
