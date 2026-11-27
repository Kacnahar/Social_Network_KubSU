import { ScrollView } from 'react-native';
import { BottomSheet, SheetRow } from '../../ui/BottomSheet';
import { DISTRICTS, type DistrictChoice } from './rent';

// Выбор района: то же нижнее окно на полэкрана, что «Отправить GIF» (общий `BottomSheet`): список с прокруткой,
// выбранный с галочкой; нажатие выбирает и закрывает окно
export function DistrictSheet({ visible, value, onPick, onClose }: { visible: boolean; value: DistrictChoice | null; onPick: (value: DistrictChoice) => void; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Район" expandable onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        {DISTRICTS.map((item, index) => (
          <SheetRow key={item.value} title={item.label} first={index === 0} selected={value === item.value} onPress={() => onPick(item.value)} />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
