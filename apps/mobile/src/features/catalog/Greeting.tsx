import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { WeatherGlyph } from './CatalogIcons';
import { greetingFor } from './greetingText';
import { formatTemp, type Weather } from './weather';

// Шапка Каталога: приветствие по времени суток (крупно) и погода в городе (мелко, серым). Плавно появляется
export function Greeting({ now, firstName, weather }: { now: Date; firstName: string | null; weather: Weather | null }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const appear = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(appear, { toValue: 1, duration: 420, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [appear, reduceMotion]);

  const text = greetingFor(now, firstName);
  return (
    <Animated.View style={[styles.row, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Text accessibilityRole="header" numberOfLines={1} style={[type.title, styles.title, { color: colors.textPrimary }]}>
        {text}
      </Text>
      {weather ? (
        <View accessible accessibilityLabel={`${weather.city}: ${formatTemp(weather.tempC)}`} style={styles.weather}>
          <WeatherGlyph kind={weather.kind} color={colors.textSecondary} />
          <Text style={[type.subhead, { color: colors.textSecondary }]}>{formatTemp(weather.tempC)}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 41 },
  title: { flex: 1 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
