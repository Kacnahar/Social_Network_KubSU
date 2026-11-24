import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Glass, TAB_BAR } from './components';
import { CatalogIcon, FeedIcon, MapIcon, ProfileIcon, VoiceIcon } from './icons';
import { useSound } from './soundStore';
import { VoicePulse } from './VoicePulse';
import { VoiceWaves } from './VoiceWaves';
import { radius, type, useColors, useReduceMotion } from './theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// Ровно пять вкладок в таком порядке; «Войс» — по центру и выделен
const TABS = ['index', 'catalog', 'voice', 'map', 'profile'] as const;
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

type ItemProps = { label: string; selected: boolean; onPress: () => void; onLongPress: () => void; icon: (color: string, filled: boolean) => ReactNode; };

// Одна вкладка. Цвет меняется плавно: неактивная и активная иконки лежат друг на друге и перетекают по прозрачности;
// подпись плавно меняет цвет
function TabItem({ label, selected, onPress, onLongPress, icon }: ItemProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const { scale, press } = usePressScale(0.9);
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      sel.setValue(selected ? 1 : 0);
      return;
    }
    Animated.timing(sel, { toValue: selected ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [selected, reduceMotion, sel]);

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
        <View style={styles.iconStack}>
          <Animated.View style={{ opacity: sel.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>{icon(colors.muted, false)}</Animated.View>
          <Animated.View style={[styles.iconTop, { opacity: sel }]}>{icon(colors.primary, true)}</Animated.View>
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[type.caption, selected && styles.selectedLabel, { color: sel.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, colors.primary] }) }]}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

// Плавающая стеклянная панель вкладок. Вкладки «Войс» у преподавателя и гостя в навигаторе нет вовсе
// (так решает layout по роли) — тогда рисуем её неактивной с подписью «Только для студентов».
export function TabBar({ state, navigateToTab, emitter, insets }: TabBarProps) {
  const colors = useColors();
  const voicePress = usePressScale(0.94);
  const reduceMotion = useReduceMotion();
  const sound = useSound();
  const current = state.routes[state.index]?.name;

  // Подложка-«пилюля» под активной вкладкой: перетекает на новое место пружинкой. Под «Войс» не заходит — там свой круг
  const [barWidth, setBarWidth] = useState(0);
  const slot = barWidth > 0 ? (barWidth - 4) / TABS.length : 0;
  const index = TABS.indexOf(current as TabName);
  const pillX = useRef(new Animated.Value(Math.max(index, 0))).current;
  const pillOn = useRef(new Animated.Value(index >= 0 && current !== 'voice' ? 1 : 0)).current;
  useEffect(() => {
    if (index < 0) return;
    const show = current !== 'voice';
    if (reduceMotion) {
      pillX.setValue(index);
      pillOn.setValue(show ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.spring(pillX, { toValue: index, stiffness: 260, damping: 26, mass: 1, useNativeDriver: false }),
      Animated.timing(pillOn, { toValue: show ? 1 : 0, duration: 180, useNativeDriver: false }),
    ]).start();
  }, [index, current, reduceMotion, pillX, pillOn]);

  // Лёгкая вибрация при нажатии: только на Android (на iPhone встроенная вибрация слишком резкая, нужен пакет haptics)
  const tick = () => {
    if (Platform.OS === 'android' && sound.vibration) Vibration.vibrate(8);
  };

  const routeOf = (name: TabName) => state.routes.find((route) => route.name === name);
  const go = (name: TabName) => {
    const route = routeOf(name);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !event.defaultPrevented) {
      tick();
      navigateToTab(route.key);
    }
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
          {/* Слой с подложкой: на всю панель, мерит её ширину */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
            {slot > 0 ? (
              <Animated.View
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    width: slot - 8,
                    opacity: pillOn,
                    transform: [{ translateX: Animated.add(Animated.multiply(pillX, slot), 2 + 4) }],
                  },
                ]}
              />
            ) : null}
          </View>
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
                      { color: voiceSelected ? colors.primary : colors.muted },
                    ]}
                  >
                    {voiceAvailable ? LABELS.voice : 'Только для\nстудентов'}
                  </Text>
                </View>
              );
            }
            const selected = current === name;
            return (
              <TabItem
                key={name}
                label={LABELS[name]}
                selected={selected}
                onPress={() => go(name)}
                onLongPress={() => longPress(name)}
                icon={(color, filled) => <TabIcon name={name} color={color} filled={filled} hole={colors.card} />}
              />
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
              style={[styles.voiceShadow, { shadowColor: colors.shadow }]}
            >
              {/* Выделяется формой, а не цветом: чёрный круг (в тёмной теме белый); у недоступной кнопки — спокойная серая заливка */}
              {voiceAvailable ? (
                <VoicePulse active={voiceSelected} size={VOICE} color={colors.primary}>
                  <View style={[styles.voice, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                    <VoiceWaves color={colors.onPrimary} playing={voiceSelected} />
                  </View>
                </VoicePulse>
              ) : (
                <View style={[styles.voice, { backgroundColor: colors.card, borderColor: colors.background }]}>
                  <VoiceIcon color={colors.muted} />
                </View>
              )}
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
  pill: { position: 'absolute', top: 7, bottom: 7, left: 0, borderRadius: radius.pill },
  iconStack: { width: 24, height: 24 },
  iconTop: { position: 'absolute', left: 0, top: 0 },
  item: { height: TAB_BAR.height, alignItems: 'center', justifyContent: 'center', gap: 3 },
  // Активную вкладку выделяем цветом и залитой иконкой; сильно жирнее подпись не делаем — длинные названия перестают помещаться
  selectedLabel: { fontWeight: '600' },
  voiceSlot: { justifyContent: 'flex-end', paddingBottom: 7 },
  voiceLabel: { textAlign: 'center' },
  voiceAnchor: { position: 'absolute', left: 0, right: 0, top: -VOICE_LIFT, alignItems: 'center' },
  voiceShadow: { borderRadius: VOICE / 2, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14, elevation: 6 },
  voice: { width: VOICE, height: VOICE, borderRadius: VOICE / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
