import { can } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ErrorText, ListScreen, noOutline } from '../../ui/components';
import { CameraIcon, ChevronRightIcon, CloseIcon, GalleryIcon } from '../../ui/icons';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../ui/Popover';
import { radius, type, useColors } from '../../ui/theme';
import { AvatarCropper } from '../profile/AvatarCropper';
import { FIELD_HEIGHT } from './FloatingField';
import { PhotoRow, photoTouch } from './PhotoRow';
import { toggleChoice } from './choices';
import { summarize } from './rent';
import { SELL_PHOTOS_MAX } from './sell';

// Общие части форм объявлений («Продать вещь», «Сдать жильё»…): шапка, блок фото, строки выбора с всплывающими окнами,
// большое поле описания. Формы собираются из них, поэтому выглядят и ведут себя одинаково.

// Сигнал «касание было в другом месте формы» — по нему на фото прячется карандаш
const HideSignal = createContext(0);

// Экран формы: шапка «✕ / заголовок / Опубликовать», прокручиваемое тело, вопрос «Выйти без сохранения?».
// Гость объявления не добавляет — его возвращаем в каталог
export function FormScreen({ title, ready, touched, onPublish, children }: { title: string; ready: boolean; touched: boolean; onPublish: () => void; children: ReactNode }) {
  const router = useRouter();
  const colors = useColors();
  const { account } = useSignedIn();
  const [leaving, setLeaving] = useState(false);
  const [hideSignal, setHideSignal] = useState(0);
  // Заголовок по центру; если он не помещается рядом с «Опубликовать», сдвигаем его влево ровно настолько, чтобы не налезать
  const [barWidth, setBarWidth] = useState(0);
  const [publishWidth, setPublishWidth] = useState(0);
  const [titleWidth, setTitleWidth] = useState(0);
  const shift = -Math.max(0, titleWidth / 2 - (barWidth / 2 - publishWidth - 10));

  if (!can(account.role, 'publish')) return <Redirect href="/catalog" />;

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));
  const askLeave = () => (touched ? setLeaving(true) : leave());

  return (
    <ListScreen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.bar} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
          <View style={styles.barSide}>
            <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={askLeave} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.4 : 1 }]}>
              <CloseIcon color={colors.textPrimary} size={20} />
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.barCenter}>
            <Text accessibilityRole="header" numberOfLines={1} onLayout={(event) => setTitleWidth(event.nativeEvent.layout.width)} style={[type.headline, { color: colors.textPrimary, transform: [{ translateX: shift }] }]}>
              {title}
            </Text>
          </View>
          <View style={[styles.barSide, styles.barEnd]}>
            <Pressable
              onLayout={(event) => setPublishWidth(event.nativeEvent.layout.width)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              disabled={!ready}
              onPress={onPublish}
              style={({ pressed }) => [styles.publish, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Text style={[type.subhead, { fontWeight: '600', color: ready ? colors.textPrimary : colors.muted }]}>Опубликовать</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onTouchStart={() => {
            // Касание внутри ряда фото карандаш не прячет, в другом месте — прячет
            if (photoTouch.inside) photoTouch.inside = false;
            else setHideSignal((value) => value + 1);
          }}
        >
          <HideSignal.Provider value={hideSignal}>{children}</HideSignal.Provider>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog visible={leaving} title="Выйти без сохранения?" message="Всё, что вы ввели, пропадёт" confirmTitle="Выйти" cancelTitle="Остаться" danger onConfirm={leave} onCancel={() => setLeaving(false)} />
    </ListScreen>
  );
}

// Блок фото: ряд с «+» (меню Галерея / Камера), перетаскивание, обложка, карандаш → обрезка 1:1.
// Выбранные фото сразу появляются как есть; обрезка открывается только по карандашу
export function PhotoSection({ photos, onChange, caption, max = SELL_PHOTOS_MAX }: { photos: string[]; onChange: (photos: string[]) => void; caption?: string; max?: number }) {
  const colors = useColors();
  const hideSignal = useContext(HideSignal);
  const anchor = useAnchor();
  const [menuAt, setMenuAt] = useState<Rect | null>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (uris: string[]) => {
    const room = max - photos.length;
    onChange([...photos, ...uris.filter((uri) => !photos.includes(uri))].slice(0, photos.length + room));
  };

  const fromGallery = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: max - photos.length, quality: 0.85 });
      if (!result.canceled) add(result.assets.map((asset) => asset.uri));
    } catch {
      setError('Не получилось выбрать фото. Попробуйте ещё раз');
    }
  };

  const fromCamera = async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Нет доступа к камере. Разрешите его в настройках телефона');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled) add(result.assets.map((asset) => asset.uri));
    } catch {
      setError('Камера на этом устройстве недоступна. Выберите фото из галереи');
    }
  };

  const cropDone = (cropped: string) => {
    if (crop) onChange(photos.map((uri) => (uri === crop ? cropped : uri)));
    setCrop(null);
  };

  return (
    <View>
      <PhotoRow photos={photos} max={max} onChange={onChange} onAddPress={() => anchor.measure(setMenuAt)} addRef={anchor.ref} onEdit={setCrop} hideSignal={hideSignal} />
      <ErrorText>{error}</ErrorText>
      {caption ? <Text style={[type.footnote, { color: colors.muted }]}>{caption}</Text> : null}
      <Popover visible={menuAt !== null} anchor={menuAt} onClose={() => setMenuAt(null)}>
        <PopoverItem
          first
          title="Галерея"
          icon={<GalleryIcon color={colors.textPrimary} />}
          onPress={() => {
            setMenuAt(null);
            void fromGallery();
          }}
        />
        <PopoverItem
          title="Камера"
          icon={<CameraIcon color={colors.textPrimary} />}
          onPress={() => {
            setMenuAt(null);
            void fromCamera();
          }}
        />
      </Popover>
      {crop ? <AvatarCropper key={crop} uri={crop} shape="square" title="Обрезка фото" onCancel={() => setCrop(null)} onDone={cropDone} /> : null}
    </View>
  );
}

// Строка выбора: слева название поля, справа выбранное серым и стрелка «›»; меню открывается от правой части строки
export function SelectRow({ label, value, empty = '', anchor, onPress, last = false }: { label: string; value: string | null; empty?: string; anchor?: ReturnType<typeof useAnchor>['ref']; onPress: () => void; last?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.select, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }, last && { borderBottomWidth: 0 }]}
    >
      <Text style={[type.subhead, styles.fieldName, { color: colors.textPrimary }]}>{label}</Text>
      <View ref={anchor} collapsable={false} style={styles.selectValue}>
        <Text numberOfLines={1} style={[type.subhead, styles.selectText, { color: colors.muted }]}>
          {value ?? empty}
        </Text>
        <ChevronRightIcon color={colors.muted} />
      </View>
    </Pressable>
  );
}

// Выбор одного значения из списка: строка и всплывающее меню (как у «+» у аватарки)
export function ChoiceRow<T extends string>({ label, value, options, onChange, empty = '', last = false }: { label: string; value: T | null; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; empty?: string; last?: boolean }) {
  const anchor = useAnchor();
  const [at, setAt] = useState<Rect | null>(null);
  const shown = options.find((item) => item.value === value)?.label ?? null;
  return (
    <>
      <SelectRow label={label} value={shown} empty={empty} anchor={anchor.ref} onPress={() => anchor.measure(setAt)} last={last} />
      <Popover visible={at !== null} anchor={at} onClose={() => setAt(null)}>
        {options.map((item, index) => (
          <PopoverItem
            key={item.value}
            first={index === 0}
            title={item.label}
            selected={value === item.value}
            onPress={() => {
              setAt(null);
              onChange(item.value);
            }}
          />
        ))}
      </Popover>
    </>
  );
}

// Небольшая серая подсказка под полем (например, пример названия); показывается, пока поле пустое
export function FieldHint({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[type.footnote, styles.hint, { color: colors.muted }]}>{children}</Text>;
}

// Компактный выбор рядом с полем (например, единица цены «за час»): значение со стрелкой «›» вниз, всплывающее меню от него.
// На строке той же высоты, что и поля, с тонкой линией снизу
export function InlineSelect<T extends string>({ label, value, options, onChange, disabled = false, prefix = '', align = 'end' }: { label: string; value: T | null; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean; prefix?: string; align?: 'start' | 'end' }) {
  const colors = useColors();
  const anchor = useAnchor();
  const [at, setAt] = useState<Rect | null>(null);
  const shown = options.find((item) => item.value === value)?.label ?? '';
  return (
    <View ref={anchor.ref} collapsable={false} style={[styles.inline, { borderBottomColor: colors.border, opacity: disabled ? 0.4 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => anchor.measure(setAt)}
        style={({ pressed }) => [styles.inlineButton, align === 'start' && styles.inlineStart, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text numberOfLines={1} style={[type.subhead, { color: colors.textPrimary }]}>
          {prefix}
          {shown}
        </Text>
        <ChevronRightIcon color={colors.muted} />
      </Pressable>
      <Popover visible={at !== null} anchor={at} onClose={() => setAt(null)}>
        {options.map((item, index) => (
          <PopoverItem
            key={item.value}
            first={index === 0}
            title={item.label}
            selected={value === item.value}
            onPress={() => {
              setAt(null);
              onChange(item.value);
            }}
          />
        ))}
      </Popover>
    </View>
  );
}

// Выбор нескольких значений: меню остаётся открытым, галочки ставятся по нажатию; закрыть — нажатием мимо.
// group у пункта — номер группы: внутри группы пункты без линий, между группами тонкая линия.
// exclusive — особый пункт («Не указать»): снимает остальные галочки, а любой другой снимает его
export function MultiChoiceRow<T extends string>({ label, values, options, onChange, empty = '', last = false, exclusive }: { label: string; values: readonly T[]; options: readonly { value: T; label: string; group?: number }[]; onChange: (values: T[]) => void; empty?: string; last?: boolean; exclusive?: T }) {
  const anchor = useAnchor();
  const [at, setAt] = useState<Rect | null>(null);
  const chosen = options.filter((item) => values.includes(item.value)).map((item) => item.label);
  return (
    <>
      <SelectRow label={label} value={chosen.length > 0 ? summarize(chosen) : null} empty={empty} anchor={anchor.ref} onPress={() => anchor.measure(setAt)} last={last} />
      <Popover visible={at !== null} anchor={at} onClose={() => setAt(null)}>
        {options.map((item, index) => {
          const sameGroup = item.group !== undefined && options[index - 1]?.group === item.group;
          return <PopoverItem key={item.value} first={index === 0 || sameGroup} title={item.label} selected={values.includes(item.value)} onPress={() => onChange(toggleChoice(values, item.value, options, exclusive))} />;
        })}
      </Popover>
    </>
  );
}

const DESCRIPTION_MIN = 176;

// Большое поле описания с надписью над ним и счётчиком; растёт вместе с текстом
export function DescriptionField({ value, onChange, placeholder, max }: { value: string; onChange: (text: string) => void; placeholder: string; max: number }) {
  const colors = useColors();
  const [height, setHeight] = useState(DESCRIPTION_MIN);
  return (
    <View style={styles.descGroup}>
      <Text style={[type.subhead, styles.fieldName, { color: colors.textPrimary }]}>Описание</Text>
      <View style={[styles.descBox, { backgroundColor: colors.fill }]}>
        <TextInput
          accessibilityLabel="Описание"
          value={value}
          onChangeText={onChange}
          onContentSizeChange={(event) => setHeight(Math.max(DESCRIPTION_MIN, Math.ceil(event.nativeEvent.contentSize.height)))}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          maxLength={max}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          autoCapitalize="sentences"
          style={[type.body, styles.desc, noOutline, { color: colors.textPrimary, height }]}
        />
      </View>
      <Text style={[type.footnote, styles.counter, { color: colors.muted }]}>
        {value.length} / {max}
      </Text>
    </View>
  );
}

// Подпись раздела над группой строк (например, «Параметры»)
export function SectionLabel({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[type.subhead, styles.fieldName, styles.section, { color: colors.textPrimary }]}>{children}</Text>;
}

// Строка с галочкой под полем («Договорная», «Без залога»): одной высоты с остальными, с разделителем снизу
export function CheckLine({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <View style={[styles.negotiable, { borderBottomColor: colors.border }]}>{children}</View>;
}

export const FORM_GAP = 24;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  barSide: { flex: 1, alignItems: 'flex-start' },
  barEnd: { alignItems: 'flex-end' },
  barCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  publish: { minHeight: 44, justifyContent: 'center' },
  content: { paddingTop: 8, paddingBottom: 40, gap: FORM_GAP },
  negotiable: { minHeight: 48, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  fieldName: { fontWeight: '500' },
  section: { marginBottom: -8 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: FIELD_HEIGHT, borderBottomWidth: StyleSheet.hairlineWidth },
  selectValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  selectText: { flexShrink: 1 },
  hint: { marginTop: 6 },
  inline: { height: FIELD_HEIGHT, minWidth: 104, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  inlineStart: { justifyContent: 'flex-start' },
  inlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 44 },
  descGroup: { gap: 8 },
  descBox: { borderRadius: radius.field, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12 },
  desc: { padding: 0 },
  counter: { textAlign: 'right' },
});
