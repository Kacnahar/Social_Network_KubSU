import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../ui/BottomSheet';
import { ChevronRightIcon } from '../../ui/icons';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../ui/Popover';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { groupKey, groupLeaves, groupState, groupSummary, multiSummary, toggleGroup, toggleLeaf, type FilterGroup, type GroupState } from './adFilters';
import { toggleChoice } from './choices';
import { Collapsible } from './Collapsible';
import { SelectRow } from './FormParts';

// Квадратный чекбокс только для окна «Фильтры» (в формах объявлений другой): рамка цвета границы, при выборе — заливка primary
// и галочка (у раздела с частью пунктов — черта «—»), всё плавно за 150 мс
export function SquareCheckbox({ state, size = 20 }: { state: GroupState | boolean; size?: number }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const level: GroupState = state === true ? 'on' : state === false ? 'off' : state;
  const progress = useRef(new Animated.Value(level === 'off' ? 0 : 1)).current;

  useEffect(() => {
    const to = level === 'off' ? 0 : 1;
    if (reduceMotion) progress.setValue(to);
    else Animated.timing(progress, { toValue: to, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [level, progress, reduceMotion]);

  return (
    <View style={[styles.box, { width: size, height: size, borderColor: colors.border }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.primary, opacity: progress }]} />
      <Animated.View style={{ opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
        {level === 'partial' ? <View style={[styles.dash, { backgroundColor: colors.onPrimary }]} /> : <View style={[styles.tick, { borderColor: colors.onPrimary }]} />}
      </Animated.View>
    </View>
  );
}

// Выбор нескольких значений из короткого списка (всплывающее меню): слева от каждого варианта квадратный чекбокс,
// меню остаётся открытым, пока выбираешь; на закрытой строке — «Квартира, Комната» или «Выбрано: 5»
export function FilterMultiRow<T extends string>({ label, values, options, onChange, empty = 'Любое', last = false }: { label: string; values: readonly T[]; options: readonly { value: T; label: string; group?: number }[]; onChange: (values: T[]) => void; empty?: string; last?: boolean }) {
  const anchor = useAnchor();
  const [at, setAt] = useState<Rect | null>(null);
  const chosen = options.filter((item) => values.includes(item.value)).map((item) => item.label);
  return (
    <>
      <SelectRow label={label} value={multiSummary(chosen)} empty={empty} anchor={anchor.ref} onPress={() => anchor.measure(setAt)} last={last} />
      <Popover visible={at !== null} anchor={at} onClose={() => setAt(null)}>
        {options.map((item, index) => {
          const sameGroup = item.group !== undefined && options[index - 1]?.group === item.group;
          return <PopoverItem key={item.value} first={index === 0 || sameGroup} title={item.label} icon={<SquareCheckbox state={values.includes(item.value)} />} onPress={() => onChange(toggleChoice(values, item.value, options))} />;
        })}
      </Popover>
    </>
  );
}

// Список разделов с пунктами в нижнем окне (категории вещей и услуг, сферы вакансий, районы): у каждого пункта и у названия
// раздела квадратный чекбокс. Чекбокс раздела выбирает и снимает все его пункты, при части пунктов в нём «—».
// Раздел без пунктов («Другое», районы) — просто один пункт. Изменения видны сразу, окно закрывается свайпом или нажатием на фон
export function GroupedFilterRow({ label, title, groups, keys, onChange, empty = 'Любая', last = false }: { label: string; title?: string; groups: readonly FilterGroup[]; keys: readonly string[]; onChange: (keys: string[]) => void; empty?: string; last?: boolean }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectRow label={label} value={groupSummary(groups, keys)} empty={empty} onPress={() => setOpen(true)} last={last} />
      <BottomSheet visible={open} title={title ?? label} height={0.72} onClose={() => setOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {groups.map((group, index) => (
            // Разделы свёрнуты, пока окно открывают заново: состояние раскрытия живёт внутри и сбрасывается вместе с окном
            <GroupBlock key={group.value} group={group} keys={keys} onChange={onChange} first={index === 0} border={colors.border} />
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

// Раздел: квадратик (выбрать или снять весь раздел, раздел не раскрывает), название со стрелкой «˅» (раскрывает пункты за 200 мс,
// стрелка поворачивается). В свёрнутом разделе при частичном выборе справа мелко число выбранных пунктов
function GroupBlock({ group, keys, onChange, first, border }: { group: FilterGroup; keys: readonly string[]; onChange: (keys: string[]) => void; first: boolean; border: string }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [expanded, setExpanded] = useState(false);
  const turn = useRef(new Animated.Value(0)).current;
  const state = groupState(group, keys);
  const hasSubs = group.subs.length > 0;
  const picked = groupLeaves(group).filter((leaf) => keys.includes(leaf)).length;

  useEffect(() => {
    if (reduceMotion) turn.setValue(expanded ? 1 : 0);
    else Animated.timing(turn, { toValue: expanded ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [expanded, turn, reduceMotion]);

  const toggleAll = () => onChange(toggleGroup(group, keys));
  // Стрелка «вправо» повёрнута вниз (˅), а у раскрытого раздела — вверх (˄)
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '270deg'] });

  return (
    <View style={[!first && { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.row}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`${group.label}: выбрать все`} accessibilityState={{ checked: state === 'partial' ? 'mixed' : state === 'on' }} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} onPress={toggleAll} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <SquareCheckbox state={state} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={group.label}
          accessibilityState={hasSubs ? { expanded } : undefined}
          onPress={hasSubs ? () => setExpanded((value) => !value) : toggleAll}
          style={({ pressed }) => [styles.head, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text numberOfLines={2} style={[type.body, styles.rowText, { color: colors.textPrimary, fontWeight: '600' }]}>
            {group.label}
          </Text>
          {hasSubs && !expanded && state === 'partial' ? <Text style={[type.footnote, { color: colors.muted }]}>{picked}</Text> : null}
          {hasSubs ? (
            <Animated.View style={{ transform: [{ rotate }] }}>
              <ChevronRightIcon color={colors.muted} />
            </Animated.View>
          ) : null}
        </Pressable>
      </View>
      {hasSubs ? (
        <Collapsible show={expanded}>
          {group.subs.map((sub) => {
            const key = groupKey(group.value, sub.value);
            return <Row key={key} label={sub.label} state={keys.includes(key) ? 'on' : 'off'} onPress={() => onChange(toggleLeaf(key, keys))} />;
          })}
        </Collapsible>
      ) : null}
    </View>
  );
}

function Row({ label, state, onPress }: { label: string; state: GroupState; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: state === 'on' }} onPress={onPress} style={({ pressed }) => [styles.row, styles.rowSub, { opacity: pressed ? 0.6 : 1 }]}>
      <SquareCheckbox state={state} />
      <Text numberOfLines={2} style={[type.subhead, styles.rowText, { color: colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: 5, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill },
  tick: { width: 10, height: 5, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '-45deg' }], marginTop: -2 },
  dash: { width: 10, height: 2, borderRadius: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  rowSub: { paddingLeft: 32, minHeight: 44 },
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  rowText: { flex: 1 },
});
