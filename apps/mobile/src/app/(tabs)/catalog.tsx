import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AdRow } from '../../features/ads/AdItem';
import { filterByCategory, type Ad } from '../../features/ads/ads';
import { useAds } from '../../features/ads/store';
import { ChatGlyph, TagGlyph, TicketGlyph } from '../../features/catalog/CatalogIcons';
import { SectionRow } from '../../features/catalog/SectionRow';
import { EventRow } from '../../features/events/EventRow';
import { EVENTS, upcoming } from '../../features/events/events';
import { filterTopics, useTopics } from '../../features/forum/forum';
import { TopicRow } from '../../features/forum/TopicRow';
import { Screen, Title } from '../../ui/components';
import { SearchField } from '../../ui/SearchField';
import { type, useColors } from '../../ui/theme';

// Вкладка «Каталог» (у всех ролей): заголовок, поиск по всем разделам и три карточки — Объявления, Форум, Афиша.
// Пока что-то введено в поиск — вместо карточек найденное. Прежний насыщенный вид — в features/catalog/FullCatalogHome.tsx
export default function CatalogScreen() {
  const router = useRouter();
  const colors = useColors();
  const ads = useAds();
  const topics = useTopics();
  const [query, setQuery] = useState('');
  const [now] = useState(() => new Date());
  const searching = query.trim() !== '';

  const adsFound = searching ? filterByCategory(ads, null, query) : [];
  const topicsFound = searching ? filterTopics(topics, null, query) : [];
  const eventsFound = searching ? upcoming(EVENTS, now).filter((event) => `${event.title} ${event.place} ${event.description}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const nothing = adsFound.length + topicsFound.length + eventsFound.length === 0;
  const openAd = (ad: Ad) => router.push({ pathname: '/ad/[adId]', params: { adId: ad.adId } });

  return (
    <Screen align="top">
      <Title>Каталог</Title>
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
        <View style={styles.cards}>
          <SectionRow index={0} title="Объявления" caption="Купить, продать, жильё, работа" icon={(color) => <TagGlyph color={color} size={24} />} onPress={() => router.push({ pathname: '/catalog/[section]', params: { section: 'ads' } })} />
          <SectionRow index={1} title="Форум" caption="Вопросы и обсуждения" icon={(color) => <ChatGlyph color={color} size={24} />} onPress={() => router.push('/catalog/forum')} />
          <SectionRow index={2} title="Афиша" caption="События университета" icon={(color) => <TicketGlyph color={color} size={24} />} onPress={() => router.push('/catalog/events')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12 },
  results: { gap: 4 },
  empty: { textAlign: 'center', paddingVertical: 36 },
});
