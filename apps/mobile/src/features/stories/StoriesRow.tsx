import { can, type StoryGroup } from '@app/shared';
import { useRouter } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { type, useColors, useReduceMotion } from '../../ui/theme';

const AVATAR = 64;
const RING = 3;
const GAP = 3;
const OUTER = AVATAR + 2 * (RING + GAP);
const ITEM_WIDTH = OUTER + 8;

type CircleProps = { label: string; accessibilityLabel: string; onPress: () => void; children: ReactNode };

// Кружок с подписью; отклик на касание — сразу, пружиной без отскока
function Circle({ label, accessibilityLabel, onPress, children }: CircleProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: pressed ? 0.94 : 1, speed: 40, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={styles.item}
      >
        {children}
        <Text numberOfLines={1} style={[type.footnote, styles.label, { color: colors.text }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function Ring({ color, children }: { color: string; children: ReactNode }) {
  return <View style={[styles.ring, { borderColor: color }]}>{children}</View>;
}

// Ряд кружков вверху ленты; без историй и без права публиковать (гость) не показывается вовсе
export function StoriesRow({ groups }: { groups: StoryGroup[] | null }) {
  const router = useRouter();
  const colors = useColors();
  const { account, profile } = useSignedIn();
  const canPublish = can(account.role, 'publish');

  const mine = groups?.find((group) => group.isMine);
  const others = groups?.filter((group) => !group.isMine) ?? [];
  if (!canPublish && others.length === 0) return null;

  const open = (profileId: string) => router.push({ pathname: '/stories/[profileId]', params: { profileId } });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {canPublish ? (
        mine && mine.stories.length > 0 ? (
          <Circle label="Ваша история" accessibilityLabel="Ваша история" onPress={() => open(mine.author.profileId)}>
            <Ring color={mine.hasUnseen ? colors.accent : colors.border}>
              <Avatar avatarUrl={mine.author.avatarUrl} name={mine.author.displayName} size={AVATAR} />
            </Ring>
          </Circle>
        ) : (
          <Circle label="Добавить" accessibilityLabel="Добавить историю" onPress={() => router.navigate({ pathname: '/create', params: { kind: 'story' } })}>
            <View style={styles.ring}>
              <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={AVATAR} />
              <View style={[styles.plus, { backgroundColor: colors.accent, borderColor: colors.background }]}>
                <Text style={[type.headline, styles.plusSign, { color: colors.onAccent }]}>+</Text>
              </View>
            </View>
          </Circle>
        )
      ) : null}

      {others.map((group) => (
        <Circle
          key={group.author.profileId}
          label={group.author.displayName}
          accessibilityLabel={`История: ${group.author.displayName}${group.hasUnseen ? ', есть новые' : ''}`}
          onPress={() => open(group.author.profileId)}
        >
          <Ring color={group.hasUnseen ? colors.accent : colors.border}>
            <Avatar avatarUrl={group.author.avatarUrl} name={group.author.displayName} size={AVATAR} />
          </Ring>
        </Circle>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Ряд идёт от края до края экрана, а первый кружок выровнен по колонке
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  row: { paddingHorizontal: 20, gap: 4 },
  item: { width: ITEM_WIDTH, alignItems: 'center', gap: 6 },
  ring: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: RING,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { maxWidth: ITEM_WIDTH, textAlign: 'center' },
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusSign: { fontSize: 16, lineHeight: 18 },
});
