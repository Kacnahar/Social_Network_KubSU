import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BirthPicker } from '../profile/BirthPicker';
import { useAnchor, type Rect } from '../../ui/Popover';
import { radius, type, useColors } from '../../ui/theme';
import { formatDate, type DateParts } from './signupForm';

type DateFieldProps = {
  label: string;
  value: DateParts | null;
  onChange: (value: DateParts) => void;
  error?: string;
  // Дата, с которой открывается выбор, пока ничего не выбрано
  initial: DateParts;
};

// Поле даты: по нажатию рядом с ним открывается небольшое окно с колёсиками дня, месяца и года — без ручного ввода
export function DateField({ label, value, onChange, error, initial }: DateFieldProps) {
  const colors = useColors();
  const anchor = useAnchor();
  const [at, setAt] = useState<Rect | null>(null);

  return (
    <View style={styles.field}>
      <Pressable
        ref={anchor.ref}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${formatDate(value)}. Изменить` : `${label}. Выбрать`}
        onPress={() => anchor.measure(setAt)}
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

      <BirthPicker
        visible={at !== null}
        anchor={at}
        value={value}
        initial={initial}
        onClose={() => setAt(null)}
        onDone={(next) => {
          onChange(next);
          setAt(null);
        }}
      />
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
});
