import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BagIcon, BookIcon, HomeIcon, JobIcon, ServiceIcon } from '../../ui/icons';
import { useColors } from '../../ui/theme';
import type { Ad } from './ads';

function SectionIcon({ ad, color }: { ad: Pick<Ad, 'section' | 'kind'>; color: string }) {
  if (ad.kind === 'rent') return <HomeIcon color={color} />;
  if (ad.section === 'books') return <BookIcon color={color} />;
  if (ad.section === 'services') return <ServiceIcon color={color} />;
  if (ad.section === 'jobs') return <JobIcon color={color} />;
  return <BagIcon color={color} />;
}

// Фото объявления; если фото нет — спокойная плашка с иконкой раздела
export function AdPhoto({ ad, style, iconScale = 1 }: { ad: Pick<Ad, 'photos' | 'section' | 'kind' | 'title'>; style?: StyleProp<ViewStyle>; iconScale?: number }) {
  const colors = useColors();
  const uri = ad.photos[0];
  return (
    <View style={[styles.box, { backgroundColor: colors.accentTint }, style]}>
      {uri ? (
        <Image source={{ uri }} accessibilityLabel={`Фото: ${ad.title}`} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={{ transform: [{ scale: iconScale }] }}>
          <SectionIcon ad={ad} color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
