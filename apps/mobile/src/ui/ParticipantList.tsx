import { StyleSheet, Text, View } from 'react-native';
import type { CallParticipant } from '../lib/voiceTypes';
import { Separator } from './components';
import { type, useColors } from './theme';

function Row({ participant }: { participant: CallParticipant }) {
  const colors = useColors();
  const { name, isMe, isSpeaking, isMuted } = participant;
  const state = isSpeaking ? 'говорит' : isMuted ? 'слушает' : 'микрофон включён';
  return (
    <View
      accessible
      accessibilityLabel={`${name}${isMe ? ', вы' : ''}, ${state}`}
      style={styles.row}
    >
      {/* Кольцо всегда есть, меняется только цвет: высота строки не дёргается */}
      <View style={[styles.ring, { borderColor: isSpeaking ? colors.success : 'transparent' }]}>
        <View style={[styles.avatar, { backgroundColor: colors.fill }]}>
          <Text style={[type.headline, { color: colors.text }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={[type.body, styles.name, { color: colors.text }]}>
        {name}
        {isMe ? <Text style={{ color: colors.muted }}> · вы</Text> : null}
      </Text>
      <View style={styles.state}>
        {isSpeaking ? (
          <>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[type.subhead, { color: colors.success, fontWeight: '600' }]}>говорит</Text>
          </>
        ) : (
          <Text style={[type.subhead, { color: colors.muted }]}>{isMuted ? 'слушает' : 'на связи'}</Text>
        )}
      </View>
    </View>
  );
}

export function ParticipantList({ participants }: { participants: CallParticipant[] }) {
  return (
    <View style={styles.list}>
      {participants.map((participant, index) => (
        <View key={participant.id} style={styles.item}>
          {index > 0 ? <Separator /> : null}
          <Row participant={participant} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  item: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6 },
  ring: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
