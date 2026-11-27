import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../ui/Avatar';
import { showToast } from '../../../ui/toastStore';
import { AmenityIcon, ChevronRightIcon, MessengerIcon, PhoneIcon } from '../../../ui/icons';
import { MESSENGERS, messengerLink, phoneDigitsOf, tel, type Messenger } from '../contact';
import { radius, type, useColors, useReduceMotion } from '../../../ui/theme';
import type { Ad } from '../ads';
import type { Spec } from '../adDetail';

const native = Platform.OS !== 'web';

// Список характеристик: подпись слева серым, значение справа; тонкие разделители, без рамок
export function SpecList({ specs }: { specs: readonly Spec[] }) {
  const colors = useColors();
  if (specs.length === 0) return null;
  return (
    <View>
      {specs.map((spec, index) => (
        <View key={spec.label} style={[styles.spec, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text style={[type.subhead, styles.specLabel, { color: colors.muted }]}>{spec.label}</Text>
          <Text style={[type.subhead, styles.specValue, { color: colors.textPrimary }]}>{spec.value}</Text>
        </View>
      ))}
    </View>
  );
}

// Мелкие метки (занятость, формат…): скругление как у кнопок, без «пилюль»
export function Badges({ items }: { items: readonly string[] }) {
  const colors = useColors();
  if (items.length === 0) return null;
  return (
    <View style={styles.badges}>
      {items.map((item) => (
        <View key={item} style={[styles.badge, { backgroundColor: colors.fill }]}>
          <Text style={[type.footnote, { color: colors.textPrimary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Строка значков жилья: «2 комн. · 45 м² · 3/9 этаж»
export function HomeStats({ items }: { items: readonly string[] }) {
  const colors = useColors();
  if (items.length === 0) return null;
  return (
    <Text style={[type.headline, { color: colors.textPrimary }]} accessibilityLabel={items.join(', ')}>
      {items.join(' · ')}
    </Text>
  );
}

// Удобства: сетка мелких значков с подписями
export function AmenityGrid({ items }: { items: readonly { value: 'furniture' | 'wifi' | 'washer' | 'fridge' | 'ac'; label: string }[] }) {
  const colors = useColors();
  if (items.length === 0) return null;
  return (
    <View style={styles.amenities}>
      {items.map((item) => (
        <View key={item.value} style={styles.amenity}>
          <AmenityIcon kind={item.value} color={colors.textPrimary} size={22} />
          <Text numberOfLines={2} style={[type.footnote, styles.amenityText, { color: colors.textPrimary }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Описание: первые 5 строк, дальше «Показать полностью» с плавным раскрытием за 200 мс
const LINE = 23;
const COLLAPSED_LINES = 5;

export function ExpandableText({ text }: { text: string }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [full, setFull] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const height = useRef(new Animated.Value(COLLAPSED_LINES * LINE)).current;
  const collapsed = COLLAPSED_LINES * LINE;
  const long = full !== null && full > collapsed + 4;

  useEffect(() => {
    if (full === null) return;
    const to = open ? full : collapsed;
    if (reduceMotion) height.setValue(to);
    else Animated.timing(height, { toValue: to, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [open, full, collapsed, height, reduceMotion]);

  return (
    <View>
      {/* Невидимая копия измеряет полную высоту текста */}
      <Text pointerEvents="none" onLayout={(event) => setFull(event.nativeEvent.layout.height)} style={[type.body, styles.measure]}>
        {text}
      </Text>
      <Animated.View style={long ? { height, overflow: 'hidden' } : undefined}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{text}</Text>
      </Animated.View>
      {long ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} hitSlop={8} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
          <Text style={[type.subhead, { color: colors.textPrimary, fontWeight: '600' }]}>{open ? 'Свернуть' : 'Показать полностью'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Продавец (автор): аватарка, имя, «В приложении с …» и число объявлений; стрелка → профиль
export function SellerCard({ ad, subtitle, onPress }: { ad: Ad; subtitle: readonly string[]; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${ad.author.displayName}. Открыть профиль`} onPress={onPress} style={({ pressed }) => [styles.seller, { opacity: pressed ? 0.6 : 1 }]}>
      <Avatar avatarUrl={ad.author.avatarUrl} name={ad.author.displayName} size={48} />
      <View style={styles.sellerText}>
        <Text numberOfLines={1} style={[type.headline, { color: colors.textPrimary }]}>
          {ad.author.displayName}
        </Text>
        {subtitle.map((line) => (
          <Text key={line} numberOfLines={1} style={[type.footnote, { color: colors.muted }]}>
            {line}
          </Text>
        ))}
      </View>
      <ChevronRightIcon color={colors.muted} />
    </Pressable>
  );
}

// Нижняя панель: основная кнопка «Написать» / «Откликнуться» (на всю ширину, скругление 12) и «Позвонить», если есть телефон.
// У автора вместо этого «Редактировать» и «Статистика»
export function BottomBar({ owner, actionLabel, phone, messengers = [], onAction, onEdit, onStats, bottomInset }: { owner: boolean; actionLabel: string; phone: string | null | undefined; messengers?: readonly Messenger[]; onAction: () => void; onEdit: () => void; onStats: () => void; bottomInset: number }) {
  const colors = useColors();
  // Звонок и мессенджеры есть, только если указан полный номер
  const digits = phoneDigitsOf(phone);
  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(bottomInset, 10) + 2 }]}>
      <View style={styles.barInner}>
        {owner ? (
          <>
            <ActionButton title="Редактировать" onPress={onEdit} primary />
            <ActionButton title="Статистика" onPress={onStats} />
          </>
        ) : (
          <>
            <ActionButton title={actionLabel} onPress={onAction} primary />
            {digits !== '' ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Позвонить"
                  onPress={() => void Linking.openURL(tel(digits))}
                  style={({ pressed }) => [styles.call, { borderColor: colors.border, opacity: pressed ? 0.5 : 1 }]}
                >
                  <PhoneIcon color={colors.textPrimary} />
                </Pressable>
                {MESSENGERS.filter((item) => messengers.includes(item.value)).map((item) => (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Написать в ${item.label}`}
                    hitSlop={{ top: 4, bottom: 4 }}
                    onPress={() => openMessenger(item.value, digits)}
                    style={({ pressed }) => [styles.messenger, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <MessengerIcon kind={item.value} color={colors.textPrimary} size={24} />
                  </Pressable>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

// Открывает чат с номером. У MAX надёжной ссылки «по номеру» нет, поэтому номер копируем
function openMessenger(kind: Messenger, digits: string) {
  const link = messengerLink(kind, digits);
  if (link) {
    void Linking.openURL(link);
    return;
  }
  const number = `+7${digits}`;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(number).then(() => showToast('Номер скопирован. Откройте MAX и вставьте его в поиск'));
  } else {
    void Share.share({ message: number });
  }
}

function ActionButton({ title, onPress, primary = false }: { title: string; onPress: () => void; primary?: boolean }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (down: boolean) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: down ? 0.97 : 1, speed: 40, bounciness: 0, useNativeDriver: native }).start();
  };
  return (
    <Animated.View style={[styles.action, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        onPressIn={() => press(true)}
        onPressOut={() => press(false)}
        style={({ pressed }) => [styles.actionButton, { backgroundColor: primary ? colors.primary : colors.fill, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text numberOfLines={1} style={[type.headline, { color: primary ? colors.onPrimary : colors.onSoft }]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Block({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

const styles = StyleSheet.create({
  spec: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, minHeight: 44, paddingVertical: 12 },
  specLabel: { width: 124 },
  specValue: { flex: 1, textAlign: 'right' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.control, borderCurve: 'continuous' },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  amenity: { width: '33.33%', gap: 6, paddingRight: 8 },
  amenityText: { lineHeight: 16 },
  measure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  more: { alignSelf: 'flex-start', marginTop: 8, minHeight: 28, justifyContent: 'center' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  sellerText: { flex: 1, gap: 2 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, alignItems: 'center' },
  barInner: { width: '100%', maxWidth: 480, flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  action: { flex: 1 },
  actionButton: { minHeight: 48, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  messenger: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
  call: { width: 48, height: 48, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  block: { gap: 12 },
});
