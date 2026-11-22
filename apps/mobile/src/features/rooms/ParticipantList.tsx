import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ParticipantActions } from './ParticipantActions';
import type { CallParticipant } from './voiceTypes';
import { Separator } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

function Row({ participant, expanded, onPress }: { participant: CallParticipant; expanded: boolean; onPress: () => void }) {
  const colors = useColors();
  const { name, isMe, isSpeaking, isMuted, isLocallyMuted } = participant;
  const state = isSpeaking ? 'говорит' : isMuted ? 'слушает' : 'на связи';
  const content = (
    <>
      {/* Кольцо всегда есть, меняется только цвет: высота строки не дёргается */}
      <View style={[styles.ring, { borderColor: isSpeaking ? colors.success : 'transparent' }]}>
        <View style={[styles.avatar, { backgroundColor: colors.fill }]}>
          <Text style={[type.headline, { color: colors.text }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={[type.body, { color: colors.text }]}>
          {name}
          {isMe ? <Text style={{ color: colors.muted }}> · вы</Text> : null}
        </Text>
        {/* Вторая строка есть всегда, поэтому смена состояния не меняет высоту */}
        <Text numberOfLines={1} style={[type.subhead, { color: isSpeaking ? colors.success : colors.muted, fontWeight: isSpeaking ? '600' : '400' }]}>
          {state}
          {isLocallyMuted ? ' · заглушён вами' : ''}
        </Text>
      </View>
      {isMe ? null : <Text style={[type.subhead, styles.more, { color: colors.accent }]}>{expanded ? 'Скрыть' : 'Ещё'}</Text>}
    </>
  );
  const label = `${name}${isMe ? ', вы' : ''}, ${state}${isLocallyMuted ? ', заглушён вами' : ''}`;

  if (isMe) {
    return (
      <View accessible accessibilityLabel={label} style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Показать действия"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

type Props = {
  participants: CallParticipant[];
  roomId: string;
  token: string;
  voteActive: boolean;
  onChanged: () => void;
  onUnauthorized: () => void;
};

export function ParticipantList({ participants, roomId, token, voteActive, onChanged, onUnauthorized }: Props) {
  // Раскрыта только одна панель; если человек вышел, панель пропадает сама
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <View style={styles.list}>
      {participants.map((participant, index) => {
        const expanded = !participant.isMe && participant.id === openId;
        return (
          <View key={participant.id}>
            {index > 0 ? <Separator /> : null}
            <Row participant={participant} expanded={expanded} onPress={() => setOpenId(expanded ? null : participant.id)} />
            {expanded ? (
              <ParticipantActions
                participant={participant}
                roomId={roomId}
                token={token}
                total={participants.length}
                voteActive={voteActive}
                onChanged={onChanged}
                onUnauthorized={onUnauthorized}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 6 },
  ring: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  more: { fontWeight: '600', minWidth: 52, textAlign: 'right' },
});
