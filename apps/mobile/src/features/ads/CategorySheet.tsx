import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../../ui/BackButton';
import { BottomSheet, SheetRow } from '../../ui/BottomSheet';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { ITEM_CATEGORIES, type ItemCategory } from './sell';

const native = Platform.OS !== 'web';

type Group = { value: string; label: string; subs: readonly { value: string; label: string }[] };

// Нижнее окно выбора категории: список категорий, нажатие открывает подкатегории внутри того же окна
// (выезжают справа, «<» возвращает назад). Выбор подкатегории закрывает окно.
export function CategorySheet({ visible, category, subcategory, onPick, onClose, categories = ITEM_CATEGORIES, title = 'Категория' }: { visible: boolean; category: ItemCategory | null; subcategory: string | null; onPick: (category: ItemCategory, subcategory: string | null) => void; onClose: () => void; categories?: readonly Group[]; title?: string }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<Group | null>(null);
  const progress = useRef(new Animated.Value(0)).current; // 0 — список категорий, 1 — подкатегории

  useEffect(() => {
    if (visible) {
      setOpen(null);
      progress.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const go = (to: 0 | 1, done?: () => void) => {
    if (reduceMotion) {
      progress.setValue(to);
      done?.();
      return;
    }
    Animated.timing(progress, { toValue: to, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(done);
  };

  const choose = (item: Group) => {
    if (item.subs.length === 0) {
      onPick(item.value, null);
      return;
    }
    setOpen(item);
    go(1);
  };
  const back = () => go(0, () => setOpen(null));

  const rootX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });
  const subX = progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });

  return (
    <BottomSheet visible={visible} onClose={onClose} height={0.68}>
      <View style={styles.pages} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View style={[styles.page, { transform: [{ translateX: rootX }] }]}>
          <Text accessibilityRole="header" style={[type.headline, styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {categories.map((item, index) => (
              <SheetRow key={item.value} title={item.label} first={index === 0} selected={category === item.value} chevron={item.subs.length > 0} onPress={() => choose(item)} />
            ))}
          </ScrollView>
        </Animated.View>
        <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.page, { transform: [{ translateX: subX }] }]}>
          <View style={styles.subHeader}>
            <BackButton inline onPress={back} />
            <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.subTitle, { color: colors.textPrimary }]}>
              {open?.label ?? ''}
            </Text>
            <View style={styles.space} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {(open?.subs ?? []).map((item, index) => (
              <SheetRow key={item.value} title={item.label} first={index === 0} selected={category === open?.value && subcategory === item.value} onPress={() => open && onPick(open.value, item.value)} />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pages: { flex: 1, overflow: 'hidden' },
  page: { ...StyleSheet.absoluteFill },
  title: { textAlign: 'center', paddingBottom: 10 },
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  subTitle: { flex: 1, textAlign: 'center' },
  space: { width: 44 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
