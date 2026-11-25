import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Popover, type Rect } from '../../ui/Popover';
import { Button } from '../../ui/components';
import { radius, type, useColors } from '../../ui/theme';
import { daysInMonth, MONTHS, type DateParts } from '../auth/signupForm';
import { BIRTH_OLDEST_YEAR, birthError } from './birth';

const ROW = 40; // высота одной строки колёсика
const SHOWN = 5; // сколько строк видно

type Item = { value: number; label: string };

// Одно колёсико: прокручивается и «притягивается» к строке по центру; нажатие на строку тоже выбирает её
function Wheel({ title, items, value, onChange, flex }: { title: string; items: Item[]; value: number; onChange: (value: number) => void; flex: number }) {
  const colors = useColors();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = Math.max(0, items.findIndex((item) => item.value === value));

  // При открытии (и когда меняется длина списка дней) ставим колёсико на выбранное значение
  useEffect(() => {
    scroll.current?.scrollTo({ y: index * ROW, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  useEffect(() => () => void (settle.current && clearTimeout(settle.current)), []);

  const onScroll = (y: number) => {
    const next = Math.min(items.length - 1, Math.max(0, Math.round(y / ROW)));
    const item = items[next];
    if (item && item.value !== value) onChange(item.value);
    // Когда прокрутка затихла — доводим до ровной строки
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => scroll.current?.scrollTo({ y: next * ROW, animated: true }), 140);
  };

  return (
    <View style={{ flex }}>
      <Text style={[type.footnote, styles.title, { color: colors.muted }]}>{title}</Text>
      <View style={styles.wheel}>
        <View pointerEvents="none" style={[styles.band, { backgroundColor: colors.fill, top: ROW * 2 }]} />
        <ScrollView
          ref={scroll}
          accessibilityLabel={title}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingVertical: ROW * 2 }}
        >
          {items.map((item, i) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${item.label}`}
              accessibilityState={{ selected: item.value === value }}
              onPress={() => {
                onChange(item.value);
                scroll.current?.scrollTo({ y: i * ROW, animated: true });
              }}
              style={styles.row}
            >
              <Text style={[type.body, { color: item.value === value ? colors.text : colors.muted, fontWeight: item.value === value ? '600' : '400' }]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

type Props = {
  visible: boolean;
  // Где стоит кнопка, от которой открывается окно
  anchor: Rect | null;
  value: DateParts | null;
  // С какой даты открывать, пока ничего не выбрано
  initial?: DateParts;
  onClose: () => void;
  onDone: (value: DateParts) => void;
};

// Компактный выбор даты рождения во всплывающем окне у кнопки: три колёсика (день, месяц, год) и кнопка «Готово»
export function BirthPicker({ visible, anchor, value, initial, onClose, onDone }: Props) {
  const colors = useColors();
  const thisYear = new Date().getFullYear();
  const start: DateParts = value ?? initial ?? { day: 1, month: 1, year: thisYear - 20 };
  const [draft, setDraft] = useState<DateParts>(start);
  useEffect(() => {
    if (visible) setDraft(value ?? initial ?? { day: 1, month: 1, year: thisYear - 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pick = (next: Partial<DateParts>) => {
    const merged = { ...draft, ...next };
    setDraft({ ...merged, day: Math.min(merged.day, daysInMonth(merged.month, merged.year)) });
  };

  const days: Item[] = Array.from({ length: daysInMonth(draft.month, draft.year) }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const months: Item[] = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
  const years: Item[] = Array.from({ length: thisYear - BIRTH_OLDEST_YEAR + 1 }, (_, i) => ({ value: thisYear - i, label: String(thisYear - i) }));
  const problem = birthError(draft, new Date());

  return (
    <Popover visible={visible} anchor={anchor} size="large" onClose={onClose}>
      <View style={styles.body}>
      <Text accessibilityRole="header" style={[type.headline, styles.heading, { color: colors.text }]}>
        Дата рождения
      </Text>
      <View style={styles.columns}>
        <Wheel title="День" items={days} value={draft.day} onChange={(day) => pick({ day })} flex={1} />
        <Wheel title="Месяц" items={months} value={draft.month} onChange={(month) => pick({ month })} flex={1.7} />
        <Wheel title="Год" items={years} value={draft.year} onChange={(year) => pick({ year })} flex={1.2} />
      </View>
      <Text accessibilityRole={problem ? 'alert' : undefined} style={[type.footnote, styles.hint, { color: problem ? colors.danger : 'transparent' }]}>
        {problem ?? ' '}
      </Text>
      <Button title="Готово" disabled={problem !== null} onPress={() => onDone(draft)} />
      </View>
    </Popover>
  );
}

const styles = StyleSheet.create({
  body: { padding: 14 },
  heading: { textAlign: 'center', paddingBottom: 8 },
  columns: { flexDirection: 'row', gap: 8 },
  title: { textAlign: 'center', paddingBottom: 4 },
  wheel: { height: ROW * SHOWN, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: radius.control },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', paddingVertical: 8, minHeight: 34 },
});
