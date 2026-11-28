import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, type, useColors } from '../../ui/theme';
import { getAddressIndex, searchAddresses, type KnownDistrict, type Suggestion } from './addressSearch';
import { Collapsible } from './Collapsible';
import { FloatingField } from './FloatingField';

const MAX_SUGGESTIONS = 8;
// Список не выше 4–5 строк (около 4,5, чтобы было видно, что он листается); остальное листается внутри, форма не двигается
const LIST_MAX_HEIGHT = 200;
const scrollWeb = Platform.OS === 'web' ? ({ overscrollBehavior: 'contain' } as object) : null;
const PAUSE_MS = 150;

// Поле «Адрес» с подсказками как в поисковике: от двух букв снизу появляется список до 8 улиц, а после улицы и номера — дома.
// Совпавшая часть жирным, справа серым город. Список плавно (150 мс) появляется и исчезает; адрес всегда можно ввести вручную.
export function AddressField({ value, onChangeText, onPickDistrict, label = 'Адрес', maxLength }: { value: string; onChangeText: (text: string) => void; onPickDistrict: (district: Exclude<KnownDistrict, null>) => void; label?: string; maxLength?: number }) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  // Поиск с небольшой паузой, чтобы не тормозить при вводе
  const [query, setQuery] = useState(value);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Что вставили подсказкой: пока в поле ровно это, список не показываем
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery(value), PAUSE_MS);
    return () => clearTimeout(id);
  }, [value]);

  const found = useMemo(() => (query === value && query !== picked.current ? searchAddresses(getAddressIndex(), query, MAX_SUGGESTIONS) : null), [query, value]);
  // Последний показанный список держим, пока окно закрывается, чтобы он не «схлопывался» пустым
  const [shown, setShown] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (found) setShown(found);
  }, [found]);
  const visible = focused && found !== null;

  const pick = (item: Suggestion) => {
    picked.current = item.insert;
    onChangeText(item.insert);
    if (item.district) onPickDistrict(item.district);
  };

  return (
    <View>
      <FloatingField
        label={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        autoCapitalize="sentences"
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        onBlur={() => {
          // Небольшая задержка: нажатие на подсказку должно успеть сработать раньше, чем список спрячется
          blurTimer.current = setTimeout(() => setFocused(false), 200);
        }}
      />
      <Collapsible show={visible} duration={150}>
        <View
          // В браузере нажатие на подсказку не должно забирать фокус у поля
          {...(Platform.OS === 'web' ? ({ onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() } as object) : null)}
          style={[styles.list, { backgroundColor: colors.fill }]}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={[styles.scroll, scrollWeb]}>
          {shown.length === 0 ? (
            <Text style={[type.subhead, styles.empty, { color: colors.muted }]}>Ничего не найдено</Text>
          ) : (
            shown.map((item, index) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.insert.replace(/, $/, '')}, ${item.right}`}
                onPress={() => pick(item)}
                style={({ pressed }) => [styles.row, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text numberOfLines={1} style={[type.subhead, styles.text, { color: colors.textPrimary }]}>
                  {item.parts.map((part, i) => (
                    <Text key={i} style={part.bold ? styles.bold : undefined}>
                      {part.text}
                    </Text>
                  ))}
                </Text>
                <Text numberOfLines={1} style={[type.footnote, styles.right, { color: colors.muted }]}>
                  {item.right}
                </Text>
              </Pressable>
            ))
          )}
          </ScrollView>
        </View>
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, marginBottom: 4, borderRadius: radius.field, borderCurve: 'continuous', overflow: 'hidden' },
  scroll: { maxHeight: LIST_MAX_HEIGHT },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8 },
  text: { flex: 1 },
  bold: { fontWeight: '700' },
  right: { maxWidth: '42%', textAlign: 'right' },
  empty: { paddingHorizontal: 14, paddingVertical: 12, textAlign: 'center' },
});
