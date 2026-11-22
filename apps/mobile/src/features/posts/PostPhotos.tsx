import type { PostPhoto } from '@app/shared';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../../lib/api';
import { radius, type, useColors } from '../../ui/theme';

const MAX_HEIGHT = 480;

// Высота по пропорциям фото, но не выше предела
const heightFor = (photo: PostPhoto, width: number) =>
  photo.width > 0 ? Math.min(MAX_HEIGHT, Math.round((width * photo.height) / photo.width)) : width;

export function PostPhotos({ photos }: { photos: PostPhoto[] }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const first = photos[0];
  if (!first) return null;

  const total = photos.length;
  const height = width > 0 ? heightFor(first, width) : 0;
  const frame = { width, height, borderRadius: radius.field, borderCurve: 'continuous' as const };

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}>
      {width > 0 && total === 1 ? (
        <Image
          source={{ uri: mediaUrl(first.url) ?? undefined }}
          accessibilityLabel="Фото 1 из 1"
          style={[styles.image, frame, { backgroundColor: colors.fill }]}
          resizeMode="cover"
        />
      ) : null}
      {width > 0 && total > 1 ? (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
            style={frame}
          >
            {photos.map((photo, index) => (
              // Фото в ленте разных пропорций: высота по первому, остальные вписываются целиком
              <Image
                key={`${photo.url}-${index}`}
                source={{ uri: mediaUrl(photo.url) ?? undefined }}
                accessibilityLabel={`Фото ${index + 1} из ${total}`}
                style={[styles.image, frame, { backgroundColor: colors.fill }]}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
          <Text style={[type.footnote, styles.caption, { color: colors.muted }]}>
            {Math.min(page + 1, total)} из {total}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: 6 },
  image: { overflow: 'hidden' },
  caption: { textAlign: 'center' },
});
