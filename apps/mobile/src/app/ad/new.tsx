import { can } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AD_DESCRIPTION_MAX,
  AD_DISTRICT_MAX,
  AD_PHOTOS_MAX,
  AD_SECTIONS,
  AD_TITLE_MAX,
  RENT_TERMS,
  emptyAdDraft,
  isFree,
  isRent,
  isSection,
  kindOptions,
  priceOf,
  validateAdDraft,
  type AdDraft,
  type AdDraftField,
  type RentTerm,
} from '../../features/ads/ads';
import { addAd } from '../../features/ads/store';
import { useSignedIn } from '../../lib/session';
import { Checkbox } from '../../ui/Checkbox';
import { Chips } from '../../ui/Chips';
import { ErrorText, Field } from '../../ui/components';
import { PlusIcon } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { StepScreen } from '../../ui/StepScreen';
import { radius, type, useColors } from '../../ui/theme';

// Форма нового объявления в выбранном разделе: тип, фото, название, описание, цена («Договорная» — кроме аренды);
// для аренды жилья ещё район и срок. «Опубликовать» — внизу экрана
export default function NewAdScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account, profile } = useSignedIn();
  const params = useLocalSearchParams<{ section?: string }>();
  const section = isSection(params.section) ? params.section : null;
  const [draft, setDraft] = useState<AdDraft>(() => emptyAdDraft(section ?? 'ads'));
  const [photos, setPhotos] = useState<string[]>([]);
  // Ошибку под полем показываем после того, как человек из него вышел
  const [touched, setTouched] = useState<Partial<Record<AdDraftField, boolean>>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Без раздела форме не от чего отталкиваться; гость объявления не добавляет — возвращаем в каталог
  if (!section || !can(account.role, 'publish')) return <Redirect href="/catalog" />;

  const meta = AD_SECTIONS.find((item) => item.value === section);
  const kinds = kindOptions(section);
  const rent = isRent(draft);
  const errors = validateAdDraft(draft);
  const valid = Object.keys(errors).length === 0;
  const set = (patch: Partial<AdDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const touch = (field: AdDraftField) => setTouched((current) => ({ ...current, [field]: true }));
  const shown = (field: AdDraftField) => (touched[field] ? errors[field] : undefined);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog'));

  const pickPhotos = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: AD_PHOTOS_MAX - photos.length,
        quality: 0.85,
      });
      if (result.canceled) return;
      setPhotos((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, AD_PHOTOS_MAX));
    } catch {
      setPhotoError('Не получилось выбрать фото. Попробуйте ещё раз');
    }
  };

  const publish = () => {
    if (!valid) return;
    addAd({
      section,
      kind: draft.kind,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: priceOf(draft),
      district: rent ? draft.district.trim() : null,
      rentTerm: rent ? draft.rentTerm : null,
      photos,
      author: { profileId: profile?.profileId ?? null, displayName: profile?.displayName ?? '', avatarUrl: profile?.avatarUrl ?? null },
    });
    // Возвращаемся в тот же раздел: новое объявление наверху списка
    back();
  };

  const priceLabel = rent ? (draft.rentTerm === 'daily' ? 'Цена за сутки, ₽' : 'Цена за месяц, ₽') : 'Цена, ₽';

  return (
    <StepScreen title={meta?.newTitle ?? 'Новое объявление'} onBack={back} primary={{ title: 'Опубликовать', onPress: publish, disabled: !valid }}>
      <View style={styles.fields}>
        {kinds.length > 0 ? (
          <View style={styles.group}>
            <Text style={[type.subhead, styles.label, { color: colors.muted }]}>Тип</Text>
            <Chips
              options={kinds}
              value={draft.kind}
              allowNone={false}
              onChange={(kind) => {
                set({ kind });
                touch('kind');
              }}
            />
            {shown('kind') ? <ErrorText>{shown('kind') ?? null}</ErrorText> : null}
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={[type.subhead, styles.label, { color: colors.muted }]}>
            Фото · {photos.length} из {AD_PHOTOS_MAX}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
            {photos.length < AD_PHOTOS_MAX ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Добавить фото"
                onPress={() => void pickPhotos()}
                style={({ pressed }) => [styles.photo, styles.addPhoto, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
              >
                <PlusIcon color={colors.accent} size={22} />
              </Pressable>
            ) : null}
            {photos.map((uri, index) => (
              <View key={uri}>
                <Image source={{ uri }} accessibilityLabel={`Фото ${index + 1} из ${photos.length}`} style={[styles.photo, { backgroundColor: colors.fill }]} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Убрать фото ${index + 1}`}
                  hitSlop={8}
                  onPress={() => setPhotos((current) => current.filter((item) => item !== uri))}
                  style={[styles.remove, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                >
                  <View style={styles.cross}>
                    <PlusIcon color={colors.text} size={12} />
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <ErrorText>{photoError}</ErrorText>
        </View>

        <Field
          label="Название"
          value={draft.title}
          onChangeText={(title) => set({ title })}
          onBlur={() => touch('title')}
          maxLength={AD_TITLE_MAX}
          autoCapitalize="sentences"
          autoCorrect
          error={shown('title')}
        />
        <Field
          label="Описание"
          value={draft.description}
          onChangeText={(description) => set({ description })}
          onBlur={() => touch('description')}
          maxLength={AD_DESCRIPTION_MAX}
          autoCapitalize="sentences"
          autoCorrect
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={styles.description}
          hint={`${draft.description.length} из ${AD_DESCRIPTION_MAX}`}
          error={shown('description')}
        />

        {rent ? (
          <>
            <Field
              label="Район"
              value={draft.district}
              onChangeText={(district) => set({ district })}
              onBlur={() => touch('district')}
              maxLength={AD_DISTRICT_MAX}
              autoCapitalize="sentences"
              error={shown('district')}
            />
            <View style={styles.group}>
              <Text style={[type.subhead, styles.label, { color: colors.muted }]}>Срок</Text>
              <Segmented<RentTerm> options={RENT_TERMS} value={draft.rentTerm} onChange={(rentTerm) => set({ rentTerm })} />
            </View>
          </>
        ) : null}

        {/* Книгу отдают бесплатно — цену не спрашиваем */}
        {isFree(draft) ? null : (
        <View style={styles.group}>
          <Field
            label={priceLabel}
            value={!rent && draft.negotiable ? '' : draft.price}
            onChangeText={(price) => set({ price: price.replace(/\D/g, '') })}
            onBlur={() => touch('price')}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={9}
            editable={rent || !draft.negotiable}
            style={!rent && draft.negotiable ? styles.inactive : undefined}
            error={!rent && draft.negotiable ? undefined : shown('price')}
          />
          {/* У аренды цена обязательна, «Договорная» бывает только у остальных */}
          {rent ? null : <Checkbox label="Договорная" checked={draft.negotiable} onChange={(negotiable) => set({ negotiable })} />}
        </View>
        )}
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 20 },
  group: { gap: 8 },
  label: { fontWeight: '500', marginLeft: 4 },
  photos: { gap: 10, paddingTop: 6, paddingRight: 6 },
  photo: { width: 84, height: 84, borderRadius: radius.field, borderCurve: 'continuous' },
  addPhoto: { alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  // Крестик — тот же плюс, повёрнутый на 45°
  cross: { transform: [{ rotate: '45deg' }] },
  description: { minHeight: 130 },
  inactive: { opacity: 0.45 },
});
