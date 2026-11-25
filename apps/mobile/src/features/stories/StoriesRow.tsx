import { can, type StoryGroup } from '@app/shared';
import { useRouter } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { PlusIcon } from '../../ui/icons';
import { type, useColors, useReduceMotion } from '../../ui/theme';

const AVATAR = 64;
const RING = 2.5;
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
        <Text numberOfLines={1} style={[type.caption, styles.label, { color: colors.muted }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// Кольцо вокруг кружка: у непросмотренных истории — кольцо цвета primary (чёрное, в тёмной теме белое), у просмотренных — тонкая серая граница
function Ring({ unseen, children }: { unseen: boolean; children: ReactNode }) {
  const colors = useColors();
  if (!unseen) return <View style={[styles.ring, { borderColor: colors.border }]}>{children}</View>;
  return (
    <View style={[styles.ringUnseen, { backgroundColor: colors.primary }]}>
      <View style={[styles.ringInner, { backgroundColor: colors.background }]}>{children}</View>
    </View>
  );
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
            <Ring unseen={mine.hasUnseen}>
              <Avatar avatarUrl={mine.author.avatarUrl} name={mine.author.displayName} size={AVATAR} />
            </Ring>
          </Circle>
        ) : (
          <Circle label="Ваша история" accessibilityLabel="Ваша история. Добавить" onPress={() => router.push('/stories/new')}>
            <View style={styles.ring}>
              <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={AVATAR} />
              <View style={[styles.plus, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <PlusIcon color={colors.onPrimary} size={10} />
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
          <Ring unseen={group.hasUnseen}>
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
  row: { paddingHorizontal: 14, gap: 6 },
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
  ringUnseen: { width: OUTER, height: OUTER, borderRadius: OUTER / 2, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: OUTER - 2 * RING, height: OUTER - 2 * RING, borderRadius: (OUTER - 2 * RING) / 2, alignItems: 'center', justifyContent: 'center' },
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
});
