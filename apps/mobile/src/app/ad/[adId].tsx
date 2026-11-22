import { can } from '@app/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdPhoto } from '../../features/ads/AdPhoto';
import { KIND_LABEL, SECTION_LABEL, formatAdPrice } from '../../features/ads/ads';
import { useAd } from '../../features/ads/store';
import { formatPostTime } from '../../lib/relativeTime';
import { useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { Body, Button, Screen, Title } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

// Экран объявления: фото на всю ширину, цена крупно, описание, автор; «Написать» — внизу экрана
export default function AdScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account, profile } = useSignedIn();
  const { adId } = useLocalSearchParams<{ adId: string }>();
  const ad = useAd(adId);
  const [now] = useState(() => new Date());
  const [note, setNote] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  if (!ad) {
    return (
      <Screen>
        <Title>Такого объявления нет</Title>
        <Body muted>Возможно, его уже сняли</Body>
        <Button title="В каталог" onPress={back} />
      </Screen>
    );
  }

  const isMine = ad.author.profileId !== null && ad.author.profileId === profile?.profileId;
  // Гость объявления только смотрит; самому себе писать незачем
  const canWrite = can(account.role, 'react') && !isMine;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <AdPhoto ad={ad} style={styles.photo} iconScale={3} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Назад"
              hitSlop={10}
              onPress={back}
              style={({ pressed }) => [styles.back, { backgroundColor: colors.card, shadowColor: colors.shadow, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.chevron, { borderColor: colors.text }]} />
            </Pressable>

            <View style={styles.body}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={[type.largeTitle, { color: colors.text }]}>
                  {formatAdPrice(ad)}
                </Text>
                <Text style={[type.title, styles.title, { color: colors.text }]}>{ad.title}</Text>
                <Text style={[type.subhead, { color: colors.muted }]}>
                  {[SECTION_LABEL[ad.section], ad.kind ? KIND_LABEL[ad.kind] : null, formatPostTime(new Date(ad.createdAt), now)].filter(Boolean).join(' · ')}
                </Text>
              </View>

              {ad.kind === 'rent' && ad.district ? (
                <Text style={[type.subhead, { color: colors.muted }]}>
                  Район: {ad.district} · {ad.rentTerm === 'daily' ? 'посуточно' : 'помесячно'}
                </Text>
              ) : null}
              <Text style={[type.body, { color: colors.text }]}>{ad.description}</Text>

              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              <View style={styles.author}>
                <Avatar avatarUrl={ad.author.avatarUrl} name={ad.author.displayName} size={44} />
                <View style={styles.authorText}>
                  <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
                    {ad.author.displayName}
                  </Text>
                  <Text style={[type.footnote, { color: colors.muted }]}>{isMine ? 'Это ваше объявление' : 'Автор объявления'}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {canWrite ? (
          <View style={[styles.column, styles.footer]}>
            {note ? (
              <Text accessibilityLiveRegion="polite" style={[type.footnote, styles.note, { color: colors.muted }]}>
                Личные сообщения скоро появятся
              </Text>
            ) : null}
            <Button title="Написать" onPress={() => setNote(true)} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  back: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },
  heading: { gap: 6 },
  title: { fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth },
  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorText: { flex: 1, gap: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  note: { textAlign: 'center' },
});
