import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { noOutline } from './components';
import { radius, type, useColors } from './theme';

type CodeFieldProps = {
  label: string;
  length: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: () => void;
  error?: string | null;
  hint?: string;
};

// Код из письма: отдельная клеточка на каждую цифру. Вводит одно невидимое поле поверх клеточек,
// поэтому работают вставка и автоподстановка кода из письма
export function CodeField({ label, length, value, onChange, onComplete, error, hint }: CodeFieldProps) {
  const colors = useColors();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  // Подсвечиваем клеточку, в которую попадёт следующая цифра
  const active = Math.min(value.length, length - 1);

  return (
    <View style={styles.field}>
      <Pressable accessible={false} onPress={() => input.current?.focus()} style={styles.cells}>
        {Array.from({ length }, (_, index) => {
          const digit = value[index];
          const isActive = focused && index === active;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                // Активная клеточка: фон плотнее и тонкая линия акцентного цвета — без толстой рамки
                {
                  backgroundColor: isActive ? colors.fillActive : colors.fill,
                  borderColor: error ? colors.danger : isActive ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text style={[type.title, styles.digit, { color: colors.text }]}>{digit ?? ''}</Text>
            </View>
          );
        })}
        <TextInput
          ref={input}
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => {
            const code = text.replace(/\D/g, '').slice(0, length);
            onChange(code);
            if (code.length === length && code !== value) onComplete?.();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={length}
          autoFocus
          caretHidden
          selectionColor="transparent"
          style={[styles.hidden, noOutline]}
        />
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={[type.footnote, { color: colors.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.footnote, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 10 },
  cells: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    maxHeight: 68,
    borderWidth: 1,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontVariant: ['tabular-nums'] },
  // Поле ввода растянуто поверх клеточек и невидимо: текст и курсор прозрачные
  hidden: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, color: 'transparent', opacity: 0.02 },
});
