import { can } from '@app/shared';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignedIn } from '../../../lib/session';
import { LikeButton } from '../../../ui/ActionButtons';
import { Avatar } from '../../../ui/Avatar';
import { BackIcon, DotsIcon, FlagIcon, PencilIcon, ShareIcon, TrashIcon, BlockIcon } from '../../../ui/icons';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../../ui/Popover';
import { showToast } from '../../../ui/toastStore';
import { darkColors, radius, type, useColors } from '../../../ui/theme';
import { adsCountText, buildAdView, sinceText } from '../adDetail';
import type { Ad } from '../ads';
import { toggleFavorite, useIsFavorite } from '../favorites';
import { removeAd, useAds } from '../store';
import { AdGallery } from './AdGallery';
import { AmenityGrid, Badges, BottomBar, ExpandableText, HomeStats, SellerCard, SpecList } from './AdDetailParts';

const COLUMN = 480;
const BAR_HEIGHT = 52;
const D = darkColors;

// Страница объявления: одинаковый макет для Вещи, Жилья, Услуги и Вакансии; состав характеристик зависит от типа (adDetail.ts).
// Сверху фото-квадрат, шапка поверх фото (при прокрутке становится сплошной с названием), снизу закреплённая панель действий.
export function AdDetailScreen({ ad, onBack }: { ad: Ad; onBack: () => void }) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { account, profile } = useSignedIn();
  const ads = useAds();
  const [now] = useState(() => new Date());
  const view = useMemo(() => buildAdView(ad, now), [ad, now]);
  const favorite = useIsFavorite(ad.adId);
  const moreAnchor = useAnchor();
  const [moreAt, setMoreAt] = useState<Rect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [solid, setSolid] = useState(false);

  const size = Math.min(width, COLUMN);
  const headerH = insets.top + BAR_HEIGHT;
  const hasPhotos = ad.photos.length > 0;
  // Без фото заглушка светлая, поэтому шапка сразу «сплошная» с тёмными знаками
  const onPhoto = hasPhotos && !solid;
  const iconColor = onPhoto ? D.text : colors.textPrimary;
  const owner = ad.demoMine === true || (ad.author.profileId !== null && ad.author.profileId === profile?.profileId);
  const canReact = can(account.role, 'react');
  const sellerCount = ads.filter((item) => item.author.displayName === ad.author.displayName && item.author.profileId === ad.author.profileId).length;

  // Шапка становится сплошной раньше, чем нижний край фото (точки и «1/5») доедет до неё
  const solidStart = hasPhotos ? size - headerH - 140 : 0;
  const solidEnd = hasPhotos ? size - headerH - 50 : 1;
  const barOpacity = hasPhotos ? scrollY.interpolate({ inputRange: [solidStart, solidEnd], outputRange: [0, 1], extrapolate: 'clamp' }) : 1;
  const titleOpacity = scrollY.interpolate({ inputRange: [size - 10, size + 40], outputRange: [0, 1], extrapolate: 'clamp' });

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
    listener: (event: unknown) => {
      const y = (event as { nativeEvent: { contentOffset: { y: number } } }).nativeEvent.contentOffset.y;
      const next = hasPhotos ? y > solidEnd - 20 : true;
      setSolid((current) => (current === next ? current : next));
    },
  });

  const openSeller = () => (ad.author.profileId ? router.push({ pathname: '/profiles/[profileId]', params: { profileId: ad.author.profileId } }) : showToast('Профиль автора откроется, когда появится сервер'));
  const share = () => void Share.share({ message: `${view.title} — ${view.price}` }).catch(() => undefined);
  const sellerTitle = view.type === 'item' ? 'Продавец' : view.type === 'rent' ? 'Арендодатель' : view.type === 'service' ? 'Исполнитель' : 'Автор вакансии';

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        style={styles.fill}
        contentContainerStyle={{ paddingBottom: 96 + Math.max(insets.bottom, 10), paddingTop: hasPhotos ? 0 : headerH }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.column}>
          <AdGallery ad={ad} size={size} />

          <View style={styles.body}>
            <View style={styles.heading}>
              <View style={styles.priceRow}>
                <Text accessibilityRole="header" style={[type.largeTitle, styles.price, view.price.length > 13 && styles.priceLong, { color: colors.textPrimary }]}>
                  {view.price}
                </Text>
                {view.tag ? (
                  <View style={[styles.tag, { backgroundColor: colors.fill }]}>
                    <Text style={[type.footnote, { color: colors.textPrimary, fontWeight: '600' }]}>{view.tag}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[type.title, styles.title, { color: colors.textPrimary }]}>{view.title}</Text>
              <Text style={[type.footnote, { color: colors.muted }]}>{view.meta}</Text>
              {owner ? <Text style={[type.footnote, { color: colors.muted }]}>Это ваше объявление</Text> : null}
            </View>

            {view.type === 'rent' ? <HomeStats items={view.homeStats} /> : null}
            {view.type === 'job' && view.company ? (
              <View style={styles.company}>
                <Avatar avatarUrl={null} localUri={ad.photos[0] ?? null} name={view.company} size={40} />
                <Text numberOfLines={1} style={[type.headline, styles.companyName, { color: colors.textPrimary }]}>
                  {view.company}
                </Text>
              </View>
            ) : null}
            {view.type === 'job' ? <Badges items={view.badges} /> : null}

            <SpecList specs={view.specs} />

            {view.amenities.length > 0 ? (
              <Section title="Удобства">
                <AmenityGrid items={view.amenities} />
              </Section>
            ) : null}

            {view.address ? (
              <Section title="Адрес">
                <Text style={[type.body, { color: colors.textPrimary }]}>{view.address}</Text>
              </Section>
            ) : null}

            {ad.description.trim() !== '' ? (
              <Section title="Описание">
                <ExpandableText text={ad.description} />
              </Section>
            ) : null}

            <Section title={sellerTitle}>
              <SellerCard ad={ad} subtitle={[sinceText(ad.author.since), adsCountText(sellerCount)].filter((line): line is string => line !== null)} onPress={openSeller} />
            </Section>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Шапка поверх фото: «<», «♡», «⋯»; при прокрутке становится сплошной с названием */}
      <View pointerEvents="box-none" style={[styles.header, { height: headerH }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, opacity: barOpacity }]} />
        {hasPhotos ? <TopShade opacity={barOpacity} /> : null}
        <View pointerEvents="box-none" style={[styles.headerRow, { paddingTop: insets.top }]}>
          <HeaderButton label="Назад" onPress={onBack} shadow={onPhoto}>
            <BackIcon color={iconColor} />
          </HeaderButton>
          <Animated.Text numberOfLines={1} style={[type.headline, styles.headerTitle, { color: colors.textPrimary, opacity: titleOpacity }]}>
            {view.title}
          </Animated.Text>
          {canReact ? (
            <View style={onPhoto ? styles.shadow : undefined}>
              <LikeButton liked={favorite} onPress={() => toggleFavorite(ad.adId)} size={24} idleColor={iconColor} label={favorite ? 'Убрать из избранного' : 'В избранное'} />
            </View>
          ) : null}
          <View ref={moreAnchor.ref} collapsable={false}>
            <HeaderButton label="Ещё" onPress={() => moreAnchor.measure(setMoreAt)} shadow={onPhoto}>
              <DotsIcon color={iconColor} />
            </HeaderButton>
          </View>
        </View>
      </View>

      {owner || canReact ? (
        <BottomBar
          owner={owner}
          actionLabel={view.actionLabel}
          phone={ad.phone}
          messengers={ad.messengers}
          bottomInset={insets.bottom}
          onAction={() => showToast('Личные сообщения скоро появятся')}
          onEdit={() => showToast('Редактирование объявления скоро появится')}
          onStats={() => showToast('Статистика скоро появится')}
        />
      ) : null}

      <Popover visible={moreAt !== null} anchor={moreAt} onClose={() => setMoreAt(null)}>
        <PopoverItem
          first
          title="Поделиться"
          icon={<ShareIcon color={colors.textPrimary} size={22} />}
          onPress={() => {
            setMoreAt(null);
            share();
          }}
        />
        {owner ? (
          <>
            <PopoverItem title="Редактировать" icon={<PencilIcon color={colors.textPrimary} size={22} />} onPress={() => (setMoreAt(null), showToast('Редактирование объявления скоро появится'))} />
            <PopoverItem title="Снять с публикации" icon={<BlockIcon color={colors.textPrimary} />} onPress={() => (setMoreAt(null), showToast('Снятие с публикации скоро появится'))} />
            <PopoverItem
              danger
              title="Удалить"
              icon={<TrashIcon color={colors.danger} />}
              onPress={() => {
                setMoreAt(null);
                setConfirmDelete(true);
              }}
            />
          </>
        ) : (
          <PopoverItem danger title="Пожаловаться" icon={<FlagIcon color={colors.danger} />} onPress={() => (setMoreAt(null), showToast('Спасибо, жалоба отправлена'))} />
        )}
      </Popover>
      <ConfirmDialog
        visible={confirmDelete}
        title="Удалить объявление?"
        message="Его не будет видно в списке. Вернуть будет нельзя"
        confirmTitle="Удалить"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          removeAd(ad.adId);
          showToast('Объявление удалено');
          onBack();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[type.headline, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// Кнопка шапки: только знак; на фото — белый с лёгкой тенью, чтобы читался на любом снимке
function HeaderButton({ label, onPress, shadow, children }: { label: string; onPress: () => void; shadow: boolean; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={{ left: 4, right: 4 }} style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.4 : 1 }]}>
      <View style={shadow ? styles.shadow : undefined}>{children}</View>
    </Pressable>
  );
}

// Тёмный «подклад» сверху фото из нескольких очень прозрачных слоёв (без градиентной библиотеки): плавный переход, знаки читаются на светлых снимках
const SHADE_LAYERS = [104, 96, 88, 80, 72, 64, 56, 48, 40, 32, 24, 16];

function TopShade({ opacity }: { opacity: Animated.AnimatedInterpolation<number> | number }) {
  const fade = typeof opacity === 'number' ? 1 : (opacity as Animated.AnimatedInterpolation<number>).interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View pointerEvents="none" style={[styles.shade, { opacity: fade }]}>
      {SHADE_LAYERS.map((height) => (
        <View key={height} style={[styles.shadeLayer, { height, backgroundColor: D.scrim, opacity: 0.07 }]} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: COLUMN, alignSelf: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 18 },
  heading: { gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  price: { fontWeight: '800' },
  // Длинная зарплата («30 000–45 000 ₽ / мес.») чуть мельче, чтобы не переноситься
  priceLong: { fontSize: 28, lineHeight: 34 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.control - 1, borderCurve: 'continuous' },
  title: { fontWeight: '600' },
  company: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyName: { flex: 1 },
  section: { gap: 10 },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: COLUMN, alignSelf: 'center', paddingHorizontal: 8, gap: 4 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', paddingHorizontal: 4 },
  shadow: Platform.select({
    web: { filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.55))' } as object,
    default: { shadowColor: D.background, shadowOpacity: 0.6, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  }),
  shade: { position: 'absolute', top: 0, left: 0, right: 0, height: 104 },
  shadeLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
});
