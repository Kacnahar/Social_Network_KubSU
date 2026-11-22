import type { Tabs } from 'expo-router';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glass, TAB_BAR } from './components';
import { CatalogIcon, FeedIcon, MapIcon, ProfileIcon, VoiceIcon } from './icons';
import { radius, type, useColors, useReduceMotion } from './theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// Ровно пять вкладок в таком порядке; «Войс» — по центру и выделен
const TABS = ['catalog', 'index', 'voice', 'map', 'profile'] as const;
type TabName = (typeof TABS)[number];
const LABELS: Record<TabName, string> = { index: 'Лента', catalog: 'Каталог', voice: 'Войс', map: '3D карта', profile: 'Профиль' };

const VOICE = 54; // диаметр круглой кнопки «Войс»
const VOICE_LIFT = 20; // насколько она приподнята над панелью

function TabIcon({ name, color, filled, hole }: { name: Exclude<TabName, 'voice'>; color: string; filled: boolean; hole: string }) {
  if (name === 'catalog') return <CatalogIcon color={color} filled={filled} />;
  if (name === 'map') return <MapIcon color={color} filled={filled} hole={hole} />;
  if (name === 'profile') return <ProfileIcon color={color} filled={filled} />;
  return <FeedIcon color={color} filled={filled} />;
}

// Отклик — в момент касания, а не отпускания; пружина без отскока
function usePressScale(to: number) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: pressed ? to : 1, speed: 40, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  return { scale, press };
}

type ItemProps = { label: string; selected: boolean; onPress: () => void; onLongPress: () => void; children: ReactNode };

function TabItem({ label, selected, onPress, onLongPress, children }: ItemProps) {
  const colors = useColors();
  const { scale, press } = usePressScale(0.92);
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
        style={styles.item}
      >
        {children}
        <Text numberOfLines={1} style={[type.caption, selected && styles.selectedLabel, { color: selected ? colors.accent : colors.muted }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// Плавающая стеклянная панель вкладок. Вкладки «Войс» у преподавателя и гостя в навигаторе нет вовсе
// (так решает layout по роли) — тогда рисуем её неактивной с подписью «Только для студентов».
export function TabBar({ state, navigateToTab, emitter, insets }: TabBarProps) {
  const colors = useColors();
  const voicePress = usePressScale(0.94);
  const current = state.routes[state.index]?.name;

  const routeOf = (name: TabName) => state.routes.find((route) => route.name === name);
  const go = (name: TabName) => {
    const route = routeOf(name);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !event.defaultPrevented) navigateToTab(route.key);
  };
  const longPress = (name: TabName) => {
    const route = routeOf(name);
    if (route) emitter.emit({ type: 'tabLongPress', target: route.key });
  };

  const voiceAvailable = routeOf('voice') !== undefined;
  const voiceSelected = current === 'voice';

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom: Math.max(insets.bottom, TAB_BAR.margin) }]}>
      <View pointerEvents="box-none" style={styles.column}>
        <Glass cornerRadius={radius.pill} contentStyle={styles.bar}>
          {TABS.map((name) => {
            if (name === 'voice') {
              // Под круглой кнопкой — только подпись; сама кнопка нарисована поверх панели
              return (
                <View key={name} style={[styles.itemWrap, styles.item, styles.voiceSlot]}>
                  <Text
                    numberOfLines={2}
                    style={[
                      type.caption,
                      styles.voiceLabel,
                      voiceSelected && styles.selectedLabel,
                      { color: voiceSelected ? colors.accent : colors.muted },
                    ]}
                  >
                    {voiceAvailable ? LABELS.voice : 'Только для\nстудентов'}
                  </Text>
                </View>
              );
            }
            const selected = current === name;
            return (
              <TabItem key={name} label={LABELS[name]} selected={selected} onPress={() => go(name)} onLongPress={() => longPress(name)}>
                <TabIcon name={name} color={selected ? colors.accent : colors.muted} filled={selected} hole={colors.card} />
              </TabItem>
            );
          })}
        </Glass>

        {/* Круглая кнопка «Войс»: поверх панели и чуть выше неё. Стекло обрезает содержимое, поэтому она снаружи */}
        <View pointerEvents="box-none" style={styles.voiceAnchor}>
          <Animated.View style={{ transform: [{ scale: voicePress.scale }] }}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={voiceAvailable ? 'Войс' : 'Войс. Только для студентов'}
              accessibilityState={{ selected: voiceSelected, disabled: !voiceAvailable }}
              disabled={!voiceAvailable}
              onPress={() => go('voice')}
              onLongPress={() => longPress('voice')}
              onPressIn={() => voicePress.press(true)}
              onPressOut={() => voicePress.press(false)}
              hitSlop={6}
              style={[
                styles.voice,
                {
                  backgroundColor: voiceAvailable ? colors.accent : colors.card,
                  borderColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <VoiceIcon color={voiceAvailable ? colors.onAccent : colors.muted} />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Панель плавает над содержимым и не занимает места в раскладке: отступ снизу экраны оставляют сами
  anchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  column: { width: '100%', maxWidth: 480, paddingHorizontal: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', height: TAB_BAR.height, paddingHorizontal: 2 },
  itemWrap: { flex: 1 },
  item: { height: TAB_BAR.height, alignItems: 'center', justifyContent: 'center', gap: 3 },
  // Активную вкладку выделяем цветом и залитой иконкой; сильно жирнее подпись не делаем — длинные названия перестают помещаться
  selectedLabel: { fontWeight: '600' },
  voiceSlot: { justifyContent: 'flex-end', paddingBottom: 7 },
  voiceLabel: { textAlign: 'center' },
  voiceAnchor: { position: 'absolute', left: 0, right: 0, top: -VOICE_LIFT, alignItems: 'center' },
  voice: {
    width: VOICE,
    height: VOICE,
    borderRadius: VOICE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
});
