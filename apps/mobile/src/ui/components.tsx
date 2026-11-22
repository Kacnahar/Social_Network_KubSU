import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, type, useColors, useReduceMotion, useReduceTransparency, useScheme } from './theme';

// Настоящее «жидкое стекло» есть только на iOS 26+; на остальных платформах — размытие с подсветкой края
const liquidGlass = isLiquidGlassAvailable();

export function Screen({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'top' }) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scroll, align === 'center' && styles.scrollCentered]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const colors = useColors();
  return <Text style={[muted ? type.subhead : type.body, { color: muted ? colors.muted : colors.text }]}>{children}</Text>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[type.headline, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function Separator() {
  const colors = useColors();
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const scheme = useScheme();
  const solid = useReduceTransparency();
  const shadow = { shadowColor: colors.shadow };

  if (solid) {
    return (
      <View style={[styles.card, styles.cardShadow, shadow, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
        <View style={styles.cardBody}>{children}</View>
      </View>
    );
  }
  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={scheme} style={[styles.card, styles.cardBody, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.card, styles.cardShadow, shadow, { borderColor: colors.glassBorder }, style]}>
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 44}
        tint={scheme}
        style={[styles.cardClip, { backgroundColor: colors.glassTint }]}
      >
        <View style={styles.cardBody}>{children}</View>
      </BlurView>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string | null };

export function Field({ label, hint, error, style, onFocus, onBlur, ...input }: FieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : 'transparent';
  return (
    <View style={styles.field}>
      <Text style={[type.subhead, styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        {...input}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[type.body, styles.input, { color: colors.text, backgroundColor: colors.fill, borderColor }, style]}
      />
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

type ButtonProps = {
  title: string;
  onPress: () => void;
  // primary — главное действие; secondary — второстепенное; plain — третьестепенное, только текст
  // danger — подтверждение опасного действия; plainDanger — вход в опасное действие
  variant?: 'primary' | 'secondary' | 'danger' | 'plain' | 'plainDanger';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  // Отклик — в момент касания, а не отпускания; пружина без отскока
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.97 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const isPlain = variant === 'plain' || variant === 'plainDanger';
  const background = {
    primary: colors.accent,
    secondary: colors.accentTint,
    danger: colors.dangerTint,
    plain: 'transparent',
    plainDanger: 'transparent',
  }[variant];
  const foreground = {
    primary: colors.onAccent,
    secondary: colors.accent,
    danger: colors.danger,
    plain: colors.accent,
    plainDanger: colors.danger,
  }[variant];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={({ pressed }) => [
          styles.button,
          isPlain && styles.buttonPlain,
          { backgroundColor: background, opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <Text style={[type.headline, { color: foreground }]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  const colors = useColors();
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[type.subhead, { color: colors.danger }]}>
      {children}
    </Text>
  );
}

export function LoadingScreen() {
  const colors = useColors();
  return (
    <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1 },
  scrollCentered: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 28, gap: 16 },
  separator: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  card: { borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  cardClip: { borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  cardBody: { padding: 20, gap: 14 },
  cardShadow: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 28, elevation: 3 },
  field: { gap: 6 },
  label: { fontWeight: '500', marginLeft: 4 },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Свою рамку фокуса рисуем сами, стандартная браузерная не нужна
    outlineWidth: 0,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlain: { minHeight: 44 },
});
