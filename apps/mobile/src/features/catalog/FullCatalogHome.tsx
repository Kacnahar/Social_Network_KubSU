import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdRow } from '../ads/AdItem';
import { filterByCategory, formatAdPrice, type Ad } from '../ads/ads';
import { useAds } from '../ads/store';
import { AskGlyph, ChatGlyph, HomeGlyph, SellGlyph, TagGlyph, TicketGlyph } from './CatalogIcons';
import { Greeting } from './Greeting';
import { firstNameOf } from './greetingText';
import { PreviewTicker, type TickerItem } from './PreviewTicker';
import { QuickActions } from './QuickActions';
import { useWeather } from './weather';
import { SectionCard } from './SectionCard';
import { EventRow } from '../events/EventRow';
import { EVENTS, filterEvents, formatEventDate, formatEventDay, upcoming } from '../events/events';
import { filterTopics, useTopics } from '../forum/forum';
import { TopicRow } from '../forum/TopicRow';
import { can } from '@app/shared';
import { useSignedIn } from '../../lib/session';
import { Screen } from '../../ui/components';
import { SearchField } from '../../ui/SearchField';
import { showToast } from '../../ui/toastStore';
import { radius, type, useColors, useScheme } from '../../ui/theme';

const DAY = 86_400_000;

// Вкладка «Каталог» (у всех ролей): поиск по всем разделам, три крупные карточки (Объявления, Форум, Афиша)
// и лента «Скоро в Афише». Пока что-то введено в поиск — вместо карточек найденное
// Прежний вид главного экрана Каталога (приветствие, погода, быстрые кнопки, бегущие строки). С экрана убран, код оставлен.
export default function FullCatalogHome() {
  const router = useRouter();
  const colors = useColors();
  const scheme = useScheme();
  const ads = useAds();
  const { account, profile } = useSignedIn();
  const weather = useWeather();
  const canPublish = can(account.role, 'publish');
  const topics = useTopics();
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());
  const searching = query.trim() !== '';

  const adsFound = searching ? filterByCategory(ads, null, query) : [];
  const topicsFound = searching ? filterTopics(topics, null, query) : [];
  const eventsFound = searching ? upcoming(EVENTS, now).filter((event) => `${event.title} ${event.place} ${event.description}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const nothing = adsFound.length + topicsFound.length + eventsFound.length === 0;

  const visibleAds = filterByCategory(ads, null, '');
  const adsToday = visibleAds.filter((ad) => now.getTime() - new Date(ad.createdAt).getTime() < DAY).length;
  // Лента превью: 6 самых свежих объявлений и 6 тем форума (пока тестовые)
  const adItems: TickerItem[] = [...visibleAds]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((ad) => ({ key: ad.adId, text: `${ad.title} · ${formatAdPrice(ad)}`, onPress: () => openAd(ad) }));
  const topicItems: TickerItem[] = topics.slice(0, 6).map((topic) => ({ key: topic.topicId, text: topic.title, onPress: () => router.push('/catalog/forum') }));
  const topicsToday = topics.filter((topic) => now.getTime() - new Date(topic.createdAt).getTime() < DAY).length;
  const soon = upcoming(EVENTS, now);
  const weekCount = filterEvents(EVENTS, 'week', now).length;
  const nextEvent = soon[0];
  const openAd = (ad: Ad) => router.push({ pathname: '/ad/[adId]', params: { adId: ad.adId } });


  return (
    <Screen align="top">
      <Greeting now={now} firstName={firstNameOf(profile?.displayName, account.role === 'guest')} weather={weather} />
      <SearchField value={query} onChangeText={setQuery} placeholder="Поиск по всем разделам" />

      {searching ? (
        nothing ? (
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>Ничего не нашлось. Попробуйте другие слова</Text>
        ) : (
          <View style={styles.results}>
            {adsFound.length > 0 ? <Text style={[type.headline, { color: colors.text }]}>Объявления</Text> : null}
            {adsFound.map((ad) => (
              <AdRow key={ad.adId} ad={ad} now={now} showSection onPress={() => openAd(ad)} />
            ))}
            {topicsFound.length > 0 ? <Text style={[type.headline, { color: colors.text }]}>Форум</Text> : null}
            {topicsFound.map((topic) => (
              <TopicRow key={topic.topicId} topic={topic} now={now} onPress={() => router.push('/catalog/forum')} />
            ))}
            {eventsFound.length > 0 ? <Text style={[type.headline, { color: colors.text }]}>Афиша</Text> : null}
            {eventsFound.map((event) => (
              <EventRow key={event.eventId} event={event} onPress={() => router.push('/catalog/events')} />
            ))}
          </View>
        )
      ) : (
        <>
          {/* Гостю «Продать» и «Спросить» бледные: по нажатию только подсказка */}
          <QuickActions
            actions={[
              {
                key: 'sell',
                label: 'Продать',
                icon: (color) => <SellGlyph color={color} />,
                dimmed: !canPublish,
                onPress: () => (canPublish ? router.push({ pathname: '/ad/new', params: { category: 'sell' } }) : showToast('Зарегистрируйтесь, чтобы публиковать')),
              },
              {
                key: 'ask',
                label: 'Спросить',
                icon: (color) => <AskGlyph color={color} />,
                dimmed: !canPublish,
                onPress: () => (canPublish ? router.push('/catalog/forum-new') : showToast('Зарегистрируйтесь, чтобы публиковать')),
              },
              {
                key: 'rent',
                label: 'Найти жильё',
                icon: (color) => <HomeGlyph color={color} />,
                onPress: () => router.push({ pathname: '/catalog/[section]', params: { section: 'ads', category: 'rent' } }),
              },
            ]}
          />
          <View style={styles.cards}>
            <SectionCard
              index={0}
              tone="light"
              title="Объявления"
              caption="Купить, продать, жильё, работа"
              badge={`+${adsToday} сегодня`}
              preview={<PreviewTicker items={adItems} color={colors.textSecondary} />}
              watermark={(color) => <TagGlyph color={color} size={110} />}
              onPress={() => router.push({ pathname: '/catalog/[section]', params: { section: 'ads' } })}
            />
            <SectionCard
              index={1}
              tone="dark"
              title="Форум"
              caption="Вопросы и обсуждения студентов"
              badge={`+${topicsToday} тем`}
              preview={<PreviewTicker items={topicItems} color={colors.onPrimary} startDelay={1500} />}
              watermark={(color) => <ChatGlyph color={color} size={110} />}
              onPress={() => router.push('/catalog/forum')}
            />
            <SectionCard
              index={2}
              tone="light"
              title="Афиша"
              caption="События университета"
              badge={`${weekCount} на неделе`}
              preview={
                nextEvent ? (
                  <PreviewTicker items={[{ key: nextEvent.eventId, text: `${nextEvent.title} · ${formatEventDate(nextEvent.startsAt)}`, onPress: () => router.push('/catalog/events') }]} color={colors.textSecondary} />
                ) : null
              }
              watermark={(color) => <TicketGlyph color={color} size={110} />}
              onPress={() => router.push('/catalog/events')}
            />
          </View>

          {soon.length > 0 ? (
            <View style={styles.soon}>
              <Text style={[type.headline, { color: colors.text }]}>Скоро в Афише</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.stripBox}>
                {soon.slice(0, 5).map((event) => (
                  <Pressable
                    key={event.eventId}
                    accessibilityRole="button"
                    accessibilityLabel={`${event.title}. ${formatEventDate(event.startsAt)}`}
                    onPress={() => showToast('Страница события откроется позже')}
                    style={({ pressed }) => [styles.event, { backgroundColor: colors.fill, borderColor: colors.border, borderWidth: scheme === 'dark' ? 0 : 1, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[type.headline, { color: colors.text }]}>{formatEventDay(event.startsAt)}</Text>
                    <Text numberOfLines={2} style={[type.footnote, { color: colors.muted }]}>
                      {event.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12 },
  results: { gap: 4 },
  empty: { textAlign: 'center', paddingVertical: 36 },
  soon: { gap: 10 },
  stripBox: { marginHorizontal: -20 },
  strip: { gap: 10, paddingHorizontal: 20 },
  event: { width: 132, minHeight: 84, borderRadius: radius.field, borderCurve: 'continuous', padding: 12, gap: 4 },
});
