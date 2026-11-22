import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../lib/api';
import { type, useColors } from './theme';

type AvatarProps = {
  // Путь вида /v1/media/<id> или готовый адрес выбранного, но ещё не сохранённого фото
  avatarUrl: string | null;
  localUri?: string | null;
  name: string;
  size: number;
  busy?: boolean;
};

// Без фото (или если оно не загрузилось) — круг с первой буквой имени
export function Avatar({ avatarUrl, localUri = null, name, size, busy = false }: AvatarProps) {
  const colors = useColors();
  const uri = localUri ?? mediaUrl(avatarUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Фото: ${name}`}
      style={[styles.base, shape, { backgroundColor: colors.accentTint }]}
    >
      {uri && !failed ? (
        <Image source={{ uri }} style={shape} onError={() => setFailed(true)} resizeMode="cover" />
      ) : (
        // Размер буквы зависит от размера круга, готовых стилей на все размеры нет
        <Text style={[type.headline, { color: colors.accent, fontSize: size * 0.42, lineHeight: size * 0.52 }]}>{initial}</Text>
      )}
      {busy ? (
        <View style={[StyleSheet.absoluteFill, styles.busy, { backgroundColor: colors.glassTint }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  busy: { alignItems: 'center', justifyContent: 'center' },
});
