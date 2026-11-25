import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinkIcon } from '../../ui/icons';
import { useColors } from '../../ui/theme';
import type { LinkService } from './links';
import { LOGO_PATHS, type LogoName } from './serviceLogos';

const LOGO = 19; // все логотипы одного размера
const LETTERS: Partial<Record<LinkService, string>> = { max: 'MAX', linkedin: 'in' };

// Логотип сервиса одного цвета (textPrimary: чёрный в светлой теме, светлый в тёмной). Нет рисунка — буквы, нет сервиса — значок ссылки
export function ServiceLogo({ service }: { service: LinkService }) {
  const colors = useColors();
  const path = service in LOGO_PATHS ? LOGO_PATHS[service as LogoName] : null;
  return (
    <View style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {path ? (
        <Svg width={LOGO} height={LOGO} viewBox="0 0 24 24">
          <Path d={path} fill={colors.textPrimary} />
        </Svg>
      ) : LETTERS[service] ? (
        <Text style={[styles.letters, { color: colors.textPrimary }]}>{LETTERS[service]}</Text>
      ) : (
        <LinkIcon color={colors.textPrimary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  letters: { fontSize: 11, fontWeight: '800', letterSpacing: -0.3 },
});
