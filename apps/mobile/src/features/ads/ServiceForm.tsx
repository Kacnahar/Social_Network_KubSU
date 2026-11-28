import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Checkbox } from '../../ui/Checkbox';
import { CategorySheet } from './CategorySheet';
import { PhoneSection } from './PhoneSection';
import { contactFields } from './contact';
import { Collapsible } from './Collapsible';
import { DistrictSheet } from './DistrictSheet';
import { FloatingField } from './FloatingField';
import { CheckLine, ChoiceRow, DescriptionField, FieldHint, FormScreen, InlineSelect, MultiChoiceRow, PhotoSection, SectionLabel, SelectRow } from './FormParts';
import { DISTRICTS, districtLabel } from './rent';
import { digitsOf, groupDigits, SELL_DESCRIPTION_MAX } from './sell';
import {
  EXPERIENCES,
  SERVICE_AUDIENCES,
  PRICE_UNITS,
  SERVICE_CATEGORIES,
  SERVICE_FORMATS,
  SERVICE_TITLE_MAX,
  TIME_SLOTS,
  asksAudience,
  emptyServiceDraft,
  isServiceReady,
  isServiceTouched,
  serviceWhere,
  showsDistrict,
  toServiceDetails,
  type ServiceDraft,
} from './service';
import { addAd } from './store';

// «Предложить услугу»: одна страница, оформление и поведение как у «Продать вещь» и «Сдать жильё» (общие части — FormParts.tsx).
// «Опубликовать» пока заглушка: объявление попадает в тестовые данные и появляется в сетке «Объявлений».
export function ServiceForm() {
  const router = useRouter();
  const { profile } = useSignedIn();
  const [draft, setDraft] = useState<ServiceDraft>(emptyServiceDraft);
  const [categorySheet, setCategorySheet] = useState(false);
  const [districtSheet, setDistrictSheet] = useState(false);
  const set = (patch: Partial<ServiceDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const ready = isServiceReady(draft);

  const publish = () => {
    if (!ready) return;
    const details = toServiceDetails(draft);
    addAd({
      section: 'services',
      kind: null,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.negotiable ? null : Number(draft.price),
      // Для карточки: район, или «Онлайн», если услуга только онлайн
      district: serviceWhere(draft.formats, districtLabel(details.district)),
      rentTerm: null,
      photos: draft.photos,
      serviceDetails: details,
      ...contactFields(draft),
      author: { profileId: profile?.profileId ?? null, displayName: profile?.displayName ?? '', avatarUrl: profile?.avatarUrl ?? null },
    });
    router.dismissTo({ pathname: '/catalog/[section]', params: { section: 'ads' } });
  };

  const categoryText = (() => {
    const found = SERVICE_CATEGORIES.find((item) => item.value === draft.category);
    if (!found) return null;
    const sub = found.subs.find((item) => item.value === draft.subcategory)?.label;
    return sub ? `${found.label} · ${sub}` : found.label;
  })();

  return (
    <FormScreen title="Предложить услугу" ready={ready} touched={isServiceTouched(draft)} onPublish={publish}>
      <PhotoSection photos={draft.photos} onChange={(photos) => set({ photos })} caption="Примеры работ. Можно без фото" />

      <View>
        <View>
          <FloatingField label="Название услуги" value={draft.title} onChangeText={(title) => set({ title })} maxLength={SERVICE_TITLE_MAX} autoCapitalize="sentences" />
          {draft.title === '' ? <FieldHint>Например, репетитор по матанализу</FieldHint> : null}
        </View>
        <SelectRow label="Категория" value={categoryText} onPress={() => setCategorySheet(true)} />
        <Collapsible show={asksAudience(draft.category)}>
          <ChoiceRow label="Для кого" value={draft.audience} options={SERVICE_AUDIENCES} onChange={(audience) => set({ audience })} />
        </Collapsible>
        <View style={styles.priceRow}>
          <InlineSelect label="Единица цены" value={draft.unit} options={PRICE_UNITS} onChange={(unit) => set({ unit })} disabled={draft.negotiable} align="start" />
          <View style={styles.price}>
            <FloatingField
              label="Цена"
              value={draft.negotiable ? '' : groupDigits(draft.price)}
              onChangeText={(text) => set({ price: digitsOf(text) })}
              keyboardType="number-pad"
              inputMode="numeric"
              editable={!draft.negotiable}
              suffix="₽"
            />
          </View>
        </View>
        <CheckLine>
          <Checkbox compact label="Договорная" checked={draft.negotiable} onChange={(negotiable) => set({ negotiable, price: negotiable ? '' : draft.price })} />
        </CheckLine>
      </View>

      <SectionLabel>Параметры</SectionLabel>
      <View>
        <MultiChoiceRow label="Формат" values={draft.formats} options={SERVICE_FORMATS} onChange={(formats) => set({ formats })} />
        <Collapsible show={showsDistrict(draft.formats)}>
          <SelectRow label="Район" value={DISTRICTS.find((item) => item.value === draft.district)?.label ?? null} onPress={() => setDistrictSheet(true)} />
        </Collapsible>
        <ChoiceRow label="Опыт" value={draft.experience} options={EXPERIENCES} onChange={(experience) => set({ experience })} />
        <MultiChoiceRow label="Когда удобно" values={draft.times} options={TIME_SLOTS} onChange={(times) => set({ times })} exclusive="skip" last />
      </View>

      <PhoneSection phone={draft.phone} messengers={draft.messengers} onChange={(patch) => set(patch)} />

      <DescriptionField value={draft.description} onChange={(description) => set({ description })} placeholder="Расскажите подробнее: что входит, опыт, условия" max={SELL_DESCRIPTION_MAX} />

      <CategorySheet
        visible={categorySheet}
        categories={SERVICE_CATEGORIES}
        category={draft.category}
        subcategory={draft.subcategory}
        onPick={(category, subcategory) => {
          setCategorySheet(false);
          set({ category, subcategory });
        }}
        onClose={() => setCategorySheet(false)}
      />
      <DistrictSheet
        visible={districtSheet}
        value={draft.district}
        onPick={(district) => {
          setDistrictSheet(false);
          set({ district });
        }}
        onClose={() => setDistrictSheet(false)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  price: { flex: 1 },
});
