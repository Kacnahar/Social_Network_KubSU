import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { noOutline } from '../../ui/components';
import { type, useColors, useReduceMotion } from '../../ui/theme';

// Поле формы с «плавающей» подписью. Пока поле пустое, подпись стоит внутри как подсказка.
// Как только появился текст, она за 200 мс поднимается в левый верхний угол и уменьшается; пустое поле — возвращается.
export const FIELD_HEIGHT = 56;
const LABEL_SMALL = 11;
const SCALE = LABEL_SMALL / 15;
const TOP_BIG = 23;
const TOP_SMALL = 6;
const native = Platform.OS !== 'web';

type Props = Pick<TextInputProps, 'keyboardType' | 'inputMode' | 'maxLength' | 'autoCapitalize' | 'onFocus' | 'onBlur'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  // Знак справа от текста, например «₽»
  suffix?: string;
};

export function FloatingField({ label, value, onChangeText, editable = true, suffix, ...input }: Props) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const filled = value.length > 0;
  const lift = useRef(new Animated.Value(filled ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) lift.setValue(filled ? 1 : 0);
    else Animated.timing(lift, { toValue: filled ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [filled, lift, reduceMotion]);

  // Куда сдвигать: вверх (слева остаётся на месте); точка отсчёта — левый верхний угол подписи
  const y = lift.interpolate({ inputRange: [0, 1], outputRange: [0, TOP_SMALL - TOP_BIG] });
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, SCALE] });

  return (
    <View style={[styles.box, { borderBottomColor: colors.border, opacity: editable ? 1 : 0.4 }]}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder=""
        selectionColor={colors.accent}
        style={[type.body, styles.input, noOutline, { color: colors.textPrimary, right: suffix ? 22 : 0 }]}
        {...input}
      />
      {suffix ? <Text style={[type.body, styles.suffix, { color: colors.muted }]}>{suffix}</Text> : null}
      <Animated.Text
        pointerEvents="none"
        style={[type.subhead, styles.label, { color: colors.muted, transform: [{ translateY: y }, { scale }] }]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: FIELD_HEIGHT, borderBottomWidth: StyleSheet.hairlineWidth },
  input: { position: 'absolute', left: 0, top: 18, height: 30, padding: 0 },
  suffix: { position: 'absolute', right: 0, top: 21 },
  label: { position: 'absolute', left: 0, top: TOP_BIG, transformOrigin: 'left top' } as object,
});
