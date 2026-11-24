import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, type, useColors, useReduceMotion, useReduceTransparency, useScheme } from './theme';

// Настоящее «жидкое стекло» есть только на iOS 26+; на остальных платформах — размытие с подсветкой края
const liquidGlass = isLiquidGlassAvailable();

// В браузере у поля в фокусе появляется стандартная толстая обводка. Она рисуется стилем «auto»,
// который не слушается толщины, поэтому отключаем сам стиль. Этого значения нет в типах React Native.
export const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

// Плавающая нижняя панель вкладок: её высота и отступы нужны и самой панели, и экранам под ней
export const TAB_BAR = { height: 64, margin: 16 };

// Сколько места снизу занимает панель вкладок; вне вкладок — 0
const TabBarSpaceContext = createContext(0);

export function TabBarSpaceProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const space = TAB_BAR.height + Math.max(insets.bottom, TAB_BAR.margin) + TAB_BAR.margin;
  return <TabBarSpaceContext.Provider value={space}>{children}</TabBarSpaceContext.Provider>;
}

export const useTabBarSpace = () => useContext(TabBarSpaceContext);

// Общая рамка экрана: фон, безопасная зона (снизу её заменяет отступ под панелью вкладок)
function ScreenFrame({ children }: { children: ReactNode }) {
  const colors = useColors();
  const underTabs = useTabBarSpace() > 0;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.screen} edges={underTabs ? ['top', 'left', 'right'] : undefined}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function Screen({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'top' }) {
  const space = useTabBarSpace();
  return (
    <ScreenFrame>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, align === 'center' && styles.scrollCentered]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.column, styles.content, space > 0 && { paddingBottom: space }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

// Экран под список (FlatList): сам прокручивается, поэтому ScrollView из Screen не нужен
export function ListScreen({ children }: { children: ReactNode }) {
  return (
    <ScreenFrame>
      <View style={[styles.screen, styles.column]}>{children}</View>
    </ScreenFrame>
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

type GlassProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Стиль содержимого (отступы, раскладка); у родного стекла он применяется к самому стеклу
  contentStyle?: StyleProp<ViewStyle>;
  cornerRadius?: number;
};

// Стеклянная поверхность: родное стекло на iOS 26+, размытие в остальных случаях, сплошная при «Понижении прозрачности»
export function Glass({ children, style, contentStyle, cornerRadius = radius.card }: GlassProps) {
  const colors = useColors();
  const scheme = useScheme();
  const solid = useReduceTransparency();
  const shape = { borderRadius: cornerRadius, borderCurve: 'continuous' } as const;
  const shadow = { shadowColor: colors.shadow };

  if (solid) {
    return (
      <View style={[styles.glass, shape, styles.glassShadow, shadow, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }
  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={scheme} style={[styles.glass, shape, contentStyle, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.glass, shape, styles.glassShadow, shadow, { borderColor: colors.glassBorder }, style]}>
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 44}
        tint={scheme}
        style={[styles.glassClip, shape, { backgroundColor: colors.glassTint }]}
      >
        <View style={contentStyle}>{children}</View>
      </BlurView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Glass style={style} contentStyle={styles.cardBody}>
      {children}
    </Glass>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string | null };

// Поле без рамки: мягкая заливка, подпись лежит внутри и уезжает наверх, когда в поле есть текст или фокус
export function Field({ label, hint, error, style, onFocus, onBlur, value, placeholder, ...input }: FieldProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const floated = focused || (value !== undefined && value !== '');
  const lift = useRef(new Animated.Value(floated ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      lift.setValue(floated ? 1 : 0);
      return;
    }
    // Двигаем положение и размер подписи, поэтому анимация идёт не на «родном» драйвере; она короткая
    Animated.timing(lift, {
      toValue: floated ? 1 : 0,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [floated, lift, reduceMotion]);

  // Активное поле видно по чуть более плотному фону и цвету подписи — без обводки.
  // Тонкая красная линия остаётся только у поля с ошибкой.
  return (
    <View style={styles.field}>
      <View
        style={[
          styles.inputBox,
          { backgroundColor: focused ? colors.fillActive : colors.fill, borderColor: error ? colors.danger : 'transparent' },
        ]}
      >
        <Animated.Text
          numberOfLines={1}
          pointerEvents="none"
          style={[
            type.body,
            styles.floatingLabel,
            {
              color: error ? colors.danger : focused ? colors.accent : colors.muted,
              top: lift.interpolate({ inputRange: [0, 1], outputRange: [17, 8] }),
              fontSize: lift.interpolate({ inputRange: [0, 1], outputRange: [17, 12] }),
              lineHeight: lift.interpolate({ inputRange: [0, 1], outputRange: [23, 16] }),
            },
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
          value={value}
          // Подсказку-пример показываем, только когда подпись уже уехала наверх, иначе они наложатся
          placeholder={floated ? placeholder : undefined}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[type.body, styles.input, noOutline, { color: colors.text }, style]}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[type.footnote, styles.fieldNote, { color: colors.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.footnote, styles.fieldNote, { color: colors.muted }]}>{hint}</Text>
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
  // compact — ниже и с текстом помельче; thin — совсем тонкая: две кнопки в ряд под шапкой профиля
  size?: 'regular' | 'compact' | 'thin';
  // Подпись для экранного чтения; если не задана — берётся title
  accessibilityLabel?: string;
};

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, size = 'regular', accessibilityLabel }: ButtonProps) {
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
    primary: colors.primary,
    secondary: colors.fill,
    danger: colors.dangerTint,
    plain: 'transparent',
    plainDanger: 'transparent',
  }[variant];
  const foreground = {
    primary: colors.onPrimary,
    secondary: colors.onSoft,
    danger: colors.danger,
    plain: colors.accent,
    plainDanger: colors.danger,
  }[variant];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        // Область нажатия до 44 px: тонкие размеры добираем по вертикали, внешний вид не меняется
        hitSlop={size === 'thin' ? { top: 3, bottom: 3, left: 0, right: 0 } : size === 'compact' ? { top: 1, bottom: 1, left: 0, right: 0 } : undefined}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={({ pressed }) => [
          styles.button,
          isPlain && styles.buttonPlain,
          size === 'compact' && styles.buttonCompact,
          size === 'thin' && styles.buttonThin,
          { backgroundColor: background, opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <Text numberOfLines={1} style={[size === 'compact' ? styles.buttonCompactText : size === 'thin' ? styles.buttonThinText : type.headline, { color: foreground }]}>
            {title}
          </Text>
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
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  content: { paddingVertical: 28, gap: 16 },
  separator: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  glass: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  glassClip: { overflow: 'hidden' },
  glassShadow: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 28, elevation: 3 },
  cardBody: { padding: 20, gap: 14 },
  field: { gap: 6 },
  fieldNote: { marginLeft: 16 },
  inputBox: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  // Подпись в покое стоит на месте текста; с текстом или фокусом уезжает наверх и уменьшается
  floatingLabel: { position: 'absolute', left: 16, right: 16, letterSpacing: 0 },
  input: {
    minHeight: 55,
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 7,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlain: { minHeight: 44 },
  buttonCompact: { minHeight: 42, paddingHorizontal: 12 },
  buttonCompactText: { ...type.subhead, fontWeight: '600' },
  buttonThin: { minHeight: 38, paddingHorizontal: 2, borderRadius: radius.control },
  buttonThinText: { ...type.footnote, fontSize: 12, letterSpacing: -0.2, fontWeight: '600' },
});
