import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DotsIcon } from '../../ui/icons';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { ParticipantActions } from './ParticipantActions';
import type { CallParticipant } from './voiceTypes';

const CIRCLE = 76;
const RING = CIRCLE + 16;

// Мягкая пульсация вокруг говорящего. Движется только пока человек говорит;
// при «Уменьшении движения» вместо пульсации — ровное кольцо
function SpeakingRing({ speaking, color }: { speaking: boolean; color: string }) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!speaking || reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, reduceMotion, pulse]);

  if (!speaking) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          borderColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.35] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        },
      ]}
    />
  );
}

type TileProps = { participant: CallParticipant; selected: boolean; handRaised: boolean; onMore: () => void };

// Участник — кружок с первой буквой ника и ник под ним. Никаких фото и настоящих имён
function Tile({ participant, selected, handRaised, onMore }: TileProps) {
  const colors = useColors();
  const { name, isMe, isSpeaking, isMuted, isLocallyMuted } = participant;
  const state = isSpeaking ? 'говорит' : isMuted ? 'слушает' : 'на связи';
  const label = `${name}${isMe ? ', вы' : ''}, ${state}${isLocallyMuted ? ', заглушён вами' : ''}${handRaised ? ', рука поднята' : ''}`;

  return (
    <View style={styles.tile}>
      <View accessible accessibilityLabel={label} style={styles.circleWrap}>
        <SpeakingRing speaking={isSpeaking} color={colors.highlight} />
        <View style={[styles.circle, { backgroundColor: isMe ? colors.accentTint : colors.fill, opacity: isLocallyMuted ? 0.5 : 1 }]}>
          <Text style={[type.title, styles.letter, { color: colors.text }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        {handRaised ? (
          <View style={[styles.badge, styles.hand, { backgroundColor: colors.highlight, borderColor: colors.background }]}>
            <Text style={[type.caption, { color: colors.onHighlight }]}>✋</Text>
          </View>
        ) : null}
        {isMe ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}: действия`}
            accessibilityState={{ expanded: selected }}
            hitSlop={8}
            onPress={onMore}
            style={({ pressed }) => [styles.badge, styles.more, { backgroundColor: selected ? colors.accent : colors.card, borderColor: colors.background, opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={styles.dots}>
              <DotsIcon color={selected ? colors.onAccent : colors.text} />
            </View>
          </Pressable>
        )}
      </View>
      <Text numberOfLines={1} style={[type.subhead, styles.name, { color: colors.text }]}>
        {name}
      </Text>
      <Text numberOfLines={1} style={[type.caption, { color: isSpeaking ? colors.live : colors.muted }]}>
        {isMe ? 'вы · ' : ''}
        {state}
        {isLocallyMuted ? ' · заглушён' : ''}
      </Text>
    </View>
  );
}

type Props = {
  participants: CallParticipant[];
  roomId: string;
  token: string;
  voteActive: boolean;
  // Моя рука поднята (пока видна только мне)
  handRaised?: boolean;
  onChanged: () => void;
  onUnauthorized: () => void;
};

// Участники кружками в три столбца. Действия с участником (заглушить для себя, голосование, жалоба) —
// по кнопке «…» у кружка: панель открывается под сеткой
export function ParticipantList({ participants, roomId, token, voteActive, handRaised = false, onChanged, onUnauthorized }: Props) {
  const colors = useColors();
  // Раскрыта только одна панель; если человек вышел, панель пропадает сама
  const [openId, setOpenId] = useState<string | null>(null);
  const open = participants.find((participant) => !participant.isMe && participant.id === openId) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {participants.map((participant) => (
          <Tile
            key={participant.id}
            participant={participant}
            selected={open?.id === participant.id}
            handRaised={participant.isMe && handRaised}
            onMore={() => setOpenId(open?.id === participant.id ? null : participant.id)}
          />
        ))}
      </View>
      {open ? (
        <View style={[styles.panel, { backgroundColor: colors.fill }]}>
          <Text style={[type.headline, { color: colors.text }]}>{open.name}</Text>
          <ParticipantActions
            participant={open}
            roomId={roomId}
            token={token}
            total={participants.length}
            voteActive={voteActive}
            onChanged={onChanged}
            onUnauthorized={onUnauthorized}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 22 },
  tile: { width: '33.33%', alignItems: 'center', gap: 3 },
  circleWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3 },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 28, lineHeight: 34 },
  badge: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hand: { left: 2, top: 2 },
  more: { right: 2, bottom: 2 },
  dots: { transform: [{ scale: 0.7 }] },
  name: { fontWeight: '600', maxWidth: '92%' },
  panel: { borderRadius: 20, padding: 16, gap: 10 },
});
