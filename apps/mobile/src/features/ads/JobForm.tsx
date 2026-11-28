import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignedIn } from '../../lib/session';
import { Checkbox } from '../../ui/Checkbox';
import { AddressField } from './AddressField';
import { PhoneSection } from './PhoneSection';
import { contactFields } from './contact';
import { CategorySheet } from './CategorySheet';
import { Collapsible } from './Collapsible';
import { DistrictSheet } from './DistrictSheet';
import { FloatingField } from './FloatingField';
import { CheckLine, ChoiceRow, DescriptionField, FieldHint, FormScreen, InlineSelect, MultiChoiceRow, PhotoSection, SectionLabel, SelectRow } from './FormParts';
import {
  EMPLOYMENTS,
  JOB_ADDRESS_MAX,
  JOB_COMPANY_MAX,
  JOB_EXPERIENCES,
  JOB_FIELDS,
  JOB_PHOTOS_MAX,
  JOB_TITLE_MAX,
  REGISTRATIONS,
  SALARY_UNITS,
  SCHEDULES,
  WORK_FORMATS,
  emptyJobDraft,
  isJobReady,
  isJobTouched,
  showsPlace,
  toJobDetails,
  type JobDraft,
} from './job';
import { DISTRICTS, districtLabel } from './rent';
import { digitsOf, groupDigits, SELL_DESCRIPTION_MAX } from './sell';
import { addAd } from './store';

// «Разместить вакансию»: одна страница, оформление и поведение как у остальных форм объявлений (общие части — FormParts.tsx).
// «Опубликовать» пока заглушка: объявление попадает в тестовые данные и появляется в сетке «Объявлений».
export function JobForm() {
  const router = useRouter();
  const { profile } = useSignedIn();
  const [draft, setDraft] = useState<JobDraft>(emptyJobDraft);
  const [fieldSheet, setFieldSheet] = useState(false);
  const [districtSheet, setDistrictSheet] = useState(false);
  const set = (patch: Partial<JobDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const ready = isJobReady(draft);
  const place = showsPlace(draft.format);

  const publish = () => {
    if (!ready) return;
    const details = toJobDetails(draft);
    addAd({
      section: 'jobs',
      kind: null,
      title: draft.position.trim(),
      description: draft.description.trim(),
      // Для сортировки по цене: нижняя граница зарплаты, а если её нет — верхняя
      price: details.salaryFrom ?? details.salaryTo,
      // Для карточки: район, а при «Удалённо» — «Удалённо»
      district: districtLabel(details.district) ?? (draft.format === 'remote' ? 'Удалённо' : null),
      rentTerm: null,
      photos: draft.photos,
      jobDetails: details,
      ...contactFields(draft),
      author: { profileId: profile?.profileId ?? null, displayName: profile?.displayName ?? '', avatarUrl: profile?.avatarUrl ?? null },
    });
    router.dismissTo({ pathname: '/catalog/[section]', params: { section: 'ads' } });
  };

  const fieldText = (() => {
    const found = JOB_FIELDS.find((item) => item.value === draft.field);
    if (!found) return null;
    const sub = found.subs.find((item) => item.value === draft.subfield)?.label;
    return sub ? `${found.label} · ${sub}` : found.label;
  })();

  return (
    <FormScreen title="Разместить вакансию" ready={ready} touched={isJobTouched(draft)} onPublish={publish}>
      <PhotoSection photos={draft.photos} onChange={(photos) => set({ photos })} max={JOB_PHOTOS_MAX} caption="Логотип или фото места работы. Можно без фото" />

      <View>
        <View>
          <FloatingField label="Должность" value={draft.position} onChangeText={(position) => set({ position })} maxLength={JOB_TITLE_MAX} autoCapitalize="sentences" />
          {draft.position === '' ? <FieldHint>Например, бариста</FieldHint> : null}
        </View>
        <FloatingField label="Компания или работодатель" value={draft.company} onChangeText={(company) => set({ company })} maxLength={JOB_COMPANY_MAX} autoCapitalize="sentences" />
        <SelectRow label="Сфера" value={fieldText} onPress={() => setFieldSheet(true)} />
        <View style={styles.salary}>
          <View style={styles.half}>
            <FloatingField
              label="Зарплата от"
              value={draft.salaryNegotiable ? '' : groupDigits(draft.salaryFrom)}
              onChangeText={(text) => set({ salaryFrom: digitsOf(text) })}
              keyboardType="number-pad"
              inputMode="numeric"
              editable={!draft.salaryNegotiable}
            />
          </View>
          <View style={styles.half}>
            <FloatingField
              label="до"
              value={draft.salaryNegotiable ? '' : groupDigits(draft.salaryTo)}
              onChangeText={(text) => set({ salaryTo: digitsOf(text) })}
              keyboardType="number-pad"
              inputMode="numeric"
              editable={!draft.salaryNegotiable}
            />
          </View>
          <InlineSelect label="Единица зарплаты" value={draft.salaryUnit} options={SALARY_UNITS} onChange={(salaryUnit) => set({ salaryUnit })} disabled={draft.salaryNegotiable} prefix="₽ " />
        </View>
        <CheckLine>
          <Checkbox
            compact
            label="По договорённости"
            checked={draft.salaryNegotiable}
            onChange={(salaryNegotiable) => set({ salaryNegotiable, salaryFrom: salaryNegotiable ? '' : draft.salaryFrom, salaryTo: salaryNegotiable ? '' : draft.salaryTo })}
          />
        </CheckLine>
      </View>

      <SectionLabel>Параметры</SectionLabel>
      <View>
        <MultiChoiceRow label="Занятость" values={draft.employment} options={EMPLOYMENTS} onChange={(employment) => set({ employment })} />
        <MultiChoiceRow label="График" values={draft.schedule} options={SCHEDULES} onChange={(schedule) => set({ schedule })} exclusive="skip" />
        <ChoiceRow label="Формат" value={draft.format} options={WORK_FORMATS} onChange={(format) => set({ format })} />
        <Collapsible show={place}>
          <AddressField value={draft.address} onChangeText={(address) => set({ address })} onPickDistrict={(district) => set({ district })} maxLength={JOB_ADDRESS_MAX} />
          <SelectRow label="Район" value={DISTRICTS.find((item) => item.value === draft.district)?.label ?? null} onPress={() => setDistrictSheet(true)} />
        </Collapsible>
        <ChoiceRow label="Опыт" value={draft.experience} options={JOB_EXPERIENCES} onChange={(experience) => set({ experience })} />
        <CheckLine>
          <Checkbox compact label="Можно совмещать с учёбой" checked={draft.studyFriendly} onChange={(studyFriendly) => set({ studyFriendly })} />
        </CheckLine>
        <ChoiceRow label="Оформление" value={draft.registration} options={REGISTRATIONS} onChange={(registration) => set({ registration })} last />
      </View>

      <PhoneSection phone={draft.phone} messengers={draft.messengers} onChange={(patch) => set(patch)} />

      <DescriptionField value={draft.description} onChange={(description) => set({ description })} placeholder="Обязанности, требования, условия" max={SELL_DESCRIPTION_MAX} />

      <CategorySheet
        visible={fieldSheet}
        categories={JOB_FIELDS}
        title="Сфера"
        category={draft.field}
        subcategory={draft.subfield}
        onPick={(field, subfield) => {
          setFieldSheet(false);
          set({ field, subfield });
        }}
        onClose={() => setFieldSheet(false)}
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
  salary: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  half: { flex: 1 },
});
