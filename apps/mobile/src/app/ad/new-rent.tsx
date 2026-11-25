import { AdForm } from '../../features/ads/AdForm';

// Форма «rent»: пока заготовка с общими полями (фото, название, описание, цена), свои поля добавим позже
export default function NewAd_rent() {
  return <AdForm category="rent" />;
}
