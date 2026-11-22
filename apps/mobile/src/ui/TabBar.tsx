import type { Tabs } from 'expo-router';
import { useRef, type ComponentProps } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glass, TAB_BAR } from './components';
import { radius, type, useColors, useReduceMotion } from './theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON = 22;

// Значки — простые фигуры, без библиотек иконок
function TabIcon({ name, color }: { name: string; color: string }) {
  if (name === 'voice') return <View style={[styles.ring, { borderColor: color }]} />;
  if (name === 'create') {
    return (
      <View style={styles.iconBox}>
        <View style={[styles.plusH, { backgroundColor: color }]} />
        <View style={[styles.plusV, { backgroundColor: color }]} />
      </View>
    );
  }
  if (name === 'profile') {
    return (
      <View style={styles.iconBox}>
        <View style={[styles.head, { backgroundColor: color }]} />
        <View style={[styles.shoulders, { backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.iconBox}>
      <View style={[styles.line, { backgroundColor: color, width: ICON }]} />
      <View style={[styles.line, { backgroundColor: color, width: ICON * 0.7 }]} />
      <View style={[styles.line, { backgroundColor: color, width: ICON }]} />
    </View>
  );
}

type TabItemProps = { label: string; icon: string; selected: boolean; onPress: () => void; onLongPress: () => void };

function TabItem({ label, icon, selected, onPress, onLongPress }: TabItemProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const color = selected ? colors.accent : colors.muted;

  // Отклик — в момент касания, а не отпускания; пружина без отскока
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.94 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={[styles.itemWrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={[styles.item, selected && { backgroundColor: colors.accentTint }]}
      >
        <TabIcon name={icon} color={color} />
        <Text style={[type.footnote, selected && styles.selectedLabel, { color }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const LABELS: Record<string, string> = { index: 'Лента', voice: 'Войс', create: 'Создать', profile: 'Профиль' };

// Плавающая стеклянная панель вкладок; какие вкладки есть, решает layout (роль человека)
export function TabBar({ state, navigateToTab, emitter, insets }: TabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom: Math.max(insets.bottom, TAB_BAR.margin) }]}>
      <View pointerEvents="box-none" style={styles.column}>
        <Glass cornerRadius={radius.pill} contentStyle={styles.bar}>
          {state.routes.map((route, index) => {
            const selected = state.index === index;
            return (
              <TabItem
                key={route.key}
                label={LABELS[route.name] ?? route.name}
                icon={route.name}
                selected={selected}
                onPress={() => {
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!selected && !event.defaultPrevented) navigateToTab(route.key);
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Панель плавает над содержимым и не занимает места в раскладке: отступ снизу экраны оставляют сами
  anchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  column: { width: '100%', maxWidth: 480, paddingHorizontal: TAB_BAR.margin },
  bar: { flexDirection: 'row', alignItems: 'center', height: TAB_BAR.height, padding: 6, gap: 4 },
  itemWrap: { flex: 1 },
  item: {
    height: TAB_BAR.height - 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selectedLabel: { fontWeight: '600' },
  iconBox: { width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center', gap: 4 },
  line: { height: 3, borderRadius: 2 },
  ring: { width: ICON, height: ICON, borderRadius: ICON / 2, borderWidth: 3 },
  plusH: { position: 'absolute', width: ICON, height: 3, borderRadius: 2 },
  plusV: { position: 'absolute', width: 3, height: ICON, borderRadius: 2 },
  head: { width: 10, height: 10, borderRadius: 5, marginBottom: 2 },
  shoulders: { width: ICON, height: 8, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
