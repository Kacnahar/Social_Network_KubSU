import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useColors, useReduceMotion } from './theme';

const SIZE = 88;

// Микрофон из двух View: капсула и дуга-подставка (без библиотек иконок)
function MicIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon} pointerEvents="none">
      <View style={[styles.capsule, { backgroundColor: color }]} />
      <View style={[styles.arc, { borderColor: color }]} />
      <View style={[styles.stem, { backgroundColor: color }]} />
    </View>
  );
}

type Props = { enabled: boolean; busy: boolean; onPress: () => void };

export function MicButton({ enabled, busy, onPress }: Props) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  // Отклик в момент касания, пружина без отскока
  const press = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.96 : 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const label = enabled ? 'Вы в эфире — нажмите, чтобы замолчать' : 'Микрофон выключен — нажмите, чтобы говорить';
  const iconColor = enabled ? colors.onAccent : colors.text;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Микрофон"
          accessibilityState={{ checked: enabled, busy }}
          onPress={onPress}
          onPressIn={() => press(true)}
          onPressOut={() => press(false)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: enabled ? colors.accent : colors.fill, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          <MicIcon color={iconColor} />
        </Pressable>
      </Animated.View>
      <Text style={[type.subhead, styles.caption, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  caption: { textAlign: 'center' },
  icon: { width: 36, height: 40, alignItems: 'center' },
  capsule: { width: 14, height: 22, borderRadius: 7 },
  arc: {
    position: 'absolute',
    top: 8,
    width: 26,
    height: 20,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  stem: { position: 'absolute', top: 29, width: 2.5, height: 7 },
});
