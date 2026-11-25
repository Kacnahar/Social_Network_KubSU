import { ComingSoon } from '../../ui/ComingSoon';
import { MapIcon } from '../../ui/icons';
import { useColors } from '../../ui/theme';

// Заглушка: раздела ещё нет, экран только занимает место во вкладках
export default function MapScreen() {
  const colors = useColors();
  return <ComingSoon title="3D карта" text="Здесь появится объёмная карта корпусов и аудиторий" icon={<MapIcon color={colors.accent} />} />;
}
