import { AdForm } from '../../features/ads/AdForm';

// Форма «sell»: пока заготовка с общими полями (фото, название, описание, цена), свои поля добавим позже
export default function NewAd_sell() {
  return <AdForm category="sell" />;
}
