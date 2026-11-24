import { AdForm } from '../../features/ads/AdForm';

// Форма «services»: пока заготовка с общими полями (фото, название, описание, цена), свои поля добавим позже
export default function NewAd_service() {
  return <AdForm category="services" />;
}
