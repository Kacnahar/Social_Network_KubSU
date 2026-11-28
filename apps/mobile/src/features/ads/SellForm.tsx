import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Checkbox } from '../../ui/Checkbox';
import { CategorySheet } from './CategorySheet';
import { FloatingField } from './FloatingField';
import { PhoneSection } from './PhoneSection';
import { contactFields } from './contact';
import { CheckLine, ChoiceRow, DescriptionField, FormScreen, PhotoSection, SelectRow } from './FormParts';
import { addAd } from './store';
import { ITEM_CONDITIONS, MEETING_PLACES, SELL_DESCRIPTION_MAX, SELL_TITLE_MAX, categoryLabel, digitsOf, emptySellDraft, groupDigits, isSellReady, isSellTouched, type SellDraft } from './sell';

// «Продать вещь»: одна страница — фото, название, цена или «Договорная», категория, состояние, место встречи, описание.
// «Опубликовать» пока заглушка: объявление попадает в тестовые данные и появляется в сетке «Объявлений».
export function SellForm() {
  const router = useRouter();
  const { profile } = useSignedIn();
  const [draft, setDraft] = useState<SellDraft>(emptySellDraft);
  const [sheet, setSheet] = useState(false);

  const set = (patch: Partial<SellDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const ready = isSellReady(draft);

  const publish = () => {
    if (!ready) return;
    addAd({
      section: 'ads',
      kind: 'sell',
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.negotiable ? null : Number(draft.price),
      district: null,
      rentTerm: null,
      photos: draft.photos,
      itemCategory: draft.category,
      itemSubcategory: draft.subcategory,
      condition: draft.condition,
      meetingPlace: draft.place,
      ...contactFields(draft),
      author: { profileId: profile?.profileId ?? null, displayName: profile?.displayName ?? '', avatarUrl: profile?.avatarUrl ?? null },
    });
    // Возвращаемся в «Объявления» (мимо выбора категории): новое объявление уже в сетке
    router.dismissTo({ pathname: '/catalog/[section]', params: { section: 'ads' } });
  };

  return (
    <FormScreen title="Продать вещь" ready={ready} touched={isSellTouched(draft)} onPublish={publish}>
      <PhotoSection photos={draft.photos} onChange={(photos) => set({ photos })} />

      <View>
        <FloatingField label="Название" value={draft.title} onChangeText={(title) => set({ title })} maxLength={SELL_TITLE_MAX} autoCapitalize="sentences" />
        <FloatingField
          label="Цена"
          value={draft.negotiable ? '' : groupDigits(draft.price)}
          onChangeText={(text) => set({ price: digitsOf(text) })}
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!draft.negotiable}
          suffix="₽"
        />
        <CheckLine>
          <Checkbox compact label="Договорная" checked={draft.negotiable} onChange={(negotiable) => set({ negotiable, price: negotiable ? '' : draft.price })} />
        </CheckLine>
        <SelectRow label="Категория" value={categoryLabel(draft.category, draft.subcategory)} onPress={() => setSheet(true)} />
        <ChoiceRow label="Состояние" value={draft.condition} options={ITEM_CONDITIONS} onChange={(condition) => set({ condition })} />
        <ChoiceRow label="Место встречи" value={draft.place} options={MEETING_PLACES} onChange={(place) => set({ place })} empty="Указать" last />
      </View>

      <PhoneSection phone={draft.phone} messengers={draft.messengers} onChange={(patch) => set(patch)} />

      <DescriptionField value={draft.description} onChange={(description) => set({ description })} placeholder="Расскажите подробнее: состояние, комплект, причина продажи" max={SELL_DESCRIPTION_MAX} />

      <CategorySheet
        visible={sheet}
        category={draft.category}
        subcategory={draft.subcategory}
        onPick={(category, subcategory) => {
          setSheet(false);
          set({ category, subcategory });
        }}
        onClose={() => setSheet(false)}
      />
    </FormScreen>
  );
}
