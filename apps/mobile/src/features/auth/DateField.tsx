import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/components';
import { radius, type, useColors } from '../../ui/theme';
import { MONTHS, daysInMonth, formatDate, type DateParts } from './signupForm';

const ROW = 44;
const OLDEST_YEAR = 1930;

type ColumnProps = { title: string; items: readonly { value: number; label: string }[]; value: number; onChange: (value: number) => void };

// Один столбец выбора: прокручиваемый список, выбранное подсвечено
function Column({ title, items, value, onChange }: ColumnProps) {
  const colors = useColors();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = Math.max(0, items.findIndex((item) => item.value === value));

  // При открытии показываем выбранное значение, а не начало списка
  useEffect(() => {
    scroll.current?.scrollTo({ y: Math.max(0, (index - 2) * ROW), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.column}>
      <Text style={[type.footnote, styles.columnTitle, { color: colors.muted }]}>{title}</Text>
      <ScrollView ref={scroll} style={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${item.label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(item.value)}
              style={[styles.row, selected && { backgroundColor: colors.accentTint }]}
            >
              <Text style={[type.body, { color: selected ? colors.accent : colors.text, fontWeight: selected ? '600' : '400' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type DateFieldProps = {
  label: string;
  value: DateParts | null;
  onChange: (value: DateParts) => void;
  error?: string;
  // Дата, с которой открывается выбор, пока ничего не выбрано
  initial: DateParts;
};

// Поле даты: по нажатию открывает лист с выбором дня, месяца и года — без ручного ввода
export function DateField({ label, value, onChange, error, initial }: DateFieldProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateParts>(value ?? initial);

  const show = () => {
    setDraft(value ?? initial);
    setOpen(true);
  };

  // День не может быть больше, чем дней в выбранном месяце
  const pick = (next: Partial<DateParts>) => {
    const merged = { ...draft, ...next };
    setDraft({ ...merged, day: Math.min(merged.day, daysInMonth(merged.month, merged.year)) });
  };

  const thisYear = new Date().getFullYear();
  const days = Array.from({ length: daysInMonth(draft.month, draft.year) }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const months = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
  const years = Array.from({ length: thisYear - OLDEST_YEAR + 1 }, (_, i) => ({ value: thisYear - i, label: String(thisYear - i) }));

  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${formatDate(value)}. Изменить` : `${label}. Выбрать`}
        onPress={show}
        style={({ pressed }) => [
          styles.input,
          { backgroundColor: colors.fill, borderColor: error ? colors.danger : 'transparent', opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {value ? (
          <>
            <Text style={[type.footnote, { color: error ? colors.danger : colors.muted }]}>{label}</Text>
            <Text style={[type.body, { color: colors.text }]}>{formatDate(value)}</Text>
          </>
        ) : (
          <Text style={[type.body, { color: colors.muted }]}>{label}</Text>
        )}
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={[type.footnote, styles.note, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Закрыть" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text accessibilityRole="header" style={[type.headline, styles.sheetTitle, { color: colors.text }]}>
              {label}
            </Text>
            <View style={styles.columns}>
              <Column title="День" items={days} value={draft.day} onChange={(day) => pick({ day })} />
              <Column title="Месяц" items={months} value={draft.month} onChange={(month) => pick({ month })} />
              <Column title="Год" items={years} value={draft.year} onChange={(year) => pick({ year })} />
            </View>
            <Button
              title="Готово"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
            <Button variant="plain" title="Отмена" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  note: { marginLeft: 16 },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  modal: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  sheetTitle: { textAlign: 'center', marginBottom: 4 },
  columns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  column: { flex: 1, gap: 6 },
  columnTitle: { textAlign: 'center' },
  list: { height: ROW * 5 },
  row: { height: ROW, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
