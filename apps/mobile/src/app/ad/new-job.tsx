import { AdForm } from '../../features/ads/AdForm';

// Форма «jobs»: пока заготовка с общими полями (фото, название, описание, цена), свои поля добавим позже
export default function NewAd_job() {
  return <AdForm category="jobs" />;
}
