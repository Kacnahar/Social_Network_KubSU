import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Checkbox } from '../../ui/Checkbox';
import { AddressField } from './AddressField';
import { PhoneSection } from './PhoneSection';
import { contactFields } from './contact';
import { DistrictSheet } from './DistrictSheet';
import { Collapsible } from './Collapsible';
import { FloatingField } from './FloatingField';
import { CheckLine, ChoiceRow, DescriptionField, FormScreen, MultiChoiceRow, PhotoSection, SectionLabel, SelectRow } from './FormParts';
import {
  AMENITIES,
  DISTRICTS,
  AUDIENCES,
  HOUSING_TYPES,
  RENT_ADDRESS_MAX,
  RENT_DESCRIPTION_MAX,
  RENT_TERM_CHOICES,
  ROOMS_COUNTS,
  TIMES_TO_UNI,
  UTILITIES,
  YES_NO,
  districtLabel,
  emptyRentDraft,
  hidesFloors,
  hidesRooms,
  isRentReady,
  isRentTouched,
  rentPriceLabel,
  rentTermOf,
  rentTitle,
  toRentDetails,
  type RentDraft,
} from './rent';
import { digitsOf, groupDigits } from './sell';
import { addAd } from './store';

// «Сдать жильё»: одна страница, оформление и поведение как у «Продать вещь» (общие части — FormParts.tsx).
// «Опубликовать» пока заглушка: объявление попадает в тестовые данные и появляется в сетке «Объявлений».
export function RentForm() {
  const router = useRouter();
  const { profile } = useSignedIn();
  const [draft, setDraft] = useState<RentDraft>(emptyRentDraft);
  const [districtSheet, setDistrictSheet] = useState(false);
  const set = (patch: Partial<RentDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const ready = isRentReady(draft);

  const publish = () => {
    if (!ready) return;
    addAd({
      section: 'ads',
      kind: 'rent',
      title: rentTitle(draft),
      description: draft.description.trim(),
      price: draft.negotiable ? null : Number(draft.price),
      // Для карточки: район, а если его нет, то адрес
      district: districtLabel(draft.district) ?? draft.address.trim(),
      rentTerm: rentTermOf(draft.term),
      photos: draft.photos,
      rentDetails: toRentDetails(draft),
      ...contactFields(draft),
      author: { profileId: profile?.profileId ?? null, displayName: profile?.displayName ?? '', avatarUrl: profile?.avatarUrl ?? null },
    });
    router.dismissTo({ pathname: '/catalog/[section]', params: { section: 'ads' } });
  };

  return (
    <FormScreen title="Сдать жильё" ready={ready} touched={isRentTouched(draft)} onPublish={publish}>
      <PhotoSection photos={draft.photos} onChange={(photos) => set({ photos })} />

      <View>
        <ChoiceRow label="Тип жилья" value={draft.housingType} options={HOUSING_TYPES} onChange={(housingType) => set({ housingType })} />
        <FloatingField
          label={rentPriceLabel(draft.term)}
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
        <AddressField value={draft.address} onChangeText={(address) => set({ address })} onPickDistrict={(district) => set({ district })} maxLength={RENT_ADDRESS_MAX} />
        <SelectRow label="Район" value={DISTRICTS.find((item) => item.value === draft.district)?.label ?? null} onPress={() => setDistrictSheet(true)} />
        <ChoiceRow label="Время до университета" value={draft.timeToUni} options={TIMES_TO_UNI} onChange={(timeToUni) => set({ timeToUni })} />
        <ChoiceRow label="Срок аренды" value={draft.term} options={RENT_TERM_CHOICES} onChange={(term) => set({ term })} last />
      </View>

      <SectionLabel>Параметры</SectionLabel>
      <View>
        <Collapsible show={!hidesRooms(draft.housingType)}>
          <ChoiceRow label="Комнат" value={draft.rooms} options={ROOMS_COUNTS} onChange={(rooms) => set({ rooms })} />
          <FloatingField label="Площадь" value={draft.area} onChangeText={(text) => set({ area: digitsOf(text).slice(0, 4) })} keyboardType="number-pad" inputMode="numeric" suffix="м²" />
        </Collapsible>
        <Collapsible show={!hidesFloors(draft.housingType)}>
          <View style={styles.pair}>
            <View style={styles.half}>
              <FloatingField label="Этаж" value={draft.floor} onChangeText={(text) => set({ floor: digitsOf(text).slice(0, 3) })} keyboardType="number-pad" inputMode="numeric" />
            </View>
            <View style={styles.half}>
              <FloatingField label="Этажей в доме" value={draft.floors} onChangeText={(text) => set({ floors: digitsOf(text).slice(0, 3) })} keyboardType="number-pad" inputMode="numeric" />
            </View>
          </View>
        </Collapsible>
        <FloatingField
          label="Залог"
          value={draft.noDeposit ? '' : groupDigits(draft.deposit)}
          onChangeText={(text) => set({ deposit: digitsOf(text) })}
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!draft.noDeposit}
          suffix="₽"
        />
        <CheckLine>
          <Checkbox compact label="Без залога" checked={draft.noDeposit} onChange={(noDeposit) => set({ noDeposit, deposit: noDeposit ? '' : draft.deposit })} />
        </CheckLine>
        <ChoiceRow label="Коммунальные услуги" value={draft.utilities} options={UTILITIES} onChange={(utilities) => set({ utilities })} />
        <ChoiceRow label="Для кого" value={draft.audience} options={AUDIENCES} onChange={(audience) => set({ audience })} />
        <MultiChoiceRow label="Удобства" values={draft.amenities} options={AMENITIES} onChange={(amenities) => set({ amenities })} />
        <ChoiceRow label="Можно с животными" value={draft.pets} options={YES_NO} onChange={(pets) => set({ pets })} />
        <ChoiceRow label="Можно курить" value={draft.smoking} options={YES_NO} onChange={(smoking) => set({ smoking })} last />
      </View>

      <DistrictSheet
        visible={districtSheet}
        value={draft.district}
        onPick={(district) => {
          setDistrictSheet(false);
          set({ district });
        }}
        onClose={() => setDistrictSheet(false)}
      />

      <PhoneSection phone={draft.phone} messengers={draft.messengers} onChange={(patch) => set(patch)} />

      <DescriptionField value={draft.description} onChange={(description) => set({ description })} placeholder="Расскажите подробнее: что рядом, правила, условия заселения" max={RENT_DESCRIPTION_MAX} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 16 },
  half: { flex: 1 },
});
