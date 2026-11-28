import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdDetailScreen } from '../../features/ads/detail/AdDetailScreen';
import { useAd } from '../../features/ads/store';
import { Body, Button, Screen, Title } from '../../ui/components';

// Страница объявления (открывается по нажатию на карточку): Вещь, Жильё, Услуга или Вакансия — см. features/ads/detail
export default function AdScreen() {
  const router = useRouter();
  const { adId } = useLocalSearchParams<{ adId: string }>();
  const ad = useAd(adId);
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
  return <AdDetailScreen ad={ad} onBack={back} />;
}
