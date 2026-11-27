import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../ui/BottomSheet';
import { Checkbox } from '../../ui/Checkbox';
import { radius, type, useColors } from '../../ui/theme';
import { applyFilters, asksAudienceIn, countActive, emptyFilters, FILTER_CATEGORIES, selectCategory, showCountText, TIME_TO_UNI_FILTERS, type AdFilters } from './adFilters';
import type { Ad } from './ads';
import { Collapsible } from './Collapsible';
import { FloatingField } from './FloatingField';
import { FilterMultiRow, GroupedFilterRow } from './FilterChecks';
import { CheckLine, SectionLabel } from './FormParts';
import { type DistrictChoice, AMENITIES, AUDIENCES, DISTRICTS, HOUSING_TYPES, RENT_TERM_CHOICES, ROOMS_COUNTS } from './rent';
import { EMPLOYMENTS, JOB_EXPERIENCES, JOB_FIELDS, SCHEDULES, WORK_FORMATS, type JobSchedule } from './job';
import { digitsOf, groupDigits, ITEM_CATEGORIES, ITEM_CONDITIONS } from './sell';
import { EXPERIENCES, SERVICE_AUDIENCES, SERVICE_CATEGORIES, SERVICE_FORMATS, TIME_SLOTS, type Experience, type ServiceAudience, type TimeSlot } from './service';

// Варианты без «Не указать»: в фильтре он не нужен
type Without<T extends string> = Exclude<T, 'skip'>;
const AUDIENCE_OPTIONS = SERVICE_AUDIENCES.filter((item) => item.value !== 'skip') as { value: Without<ServiceAudience>; label: string }[];
const EXPERIENCE_OPTIONS = EXPERIENCES.filter((item) => item.value !== 'skip') as { value: Without<Experience>; label: string }[];
const TIME_OPTIONS = TIME_SLOTS.filter((item) => item.value !== 'skip') as { value: Without<TimeSlot>; label: string; group: number }[];
const SCHEDULE_OPTIONS = SCHEDULES.filter((item) => item.value !== 'skip') as { value: Without<JobSchedule>; label: string; group: number }[];

// Районы для списка с чекбоксами: каждый район — раздел без пунктов (без «Не указать»)
const DISTRICT_GROUPS = DISTRICTS.filter((item) => item.value !== 'skip').map((item) => ({ value: item.value, label: item.label, subs: [] as { value: string; label: string }[] }));

// Окно «Фильтры»: выезжает снизу почти на весь экран (общий BottomSheet), закрывается свайпом вниз или нажатием на фон.
// Вверху категории плитками 2×2, потом общие фильтры (цена, район, «Только с фото») и плавно появляющиеся фильтры выбранной
// категории. Внизу закреплена кнопка «Показать N объявлений», число меняется на лету. Фильтры применяются кнопкой.
export function FilterSheet({ visible, filters, ads, query, onApply, onClose }: { visible: boolean; filters: AdFilters; ads: readonly Ad[]; query: string; onApply: (filters: AdFilters) => void; onClose: () => void }) {
  const colors = useColors();
  const [draft, setDraft] = useState<AdFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (patch: Partial<AdFilters>) => setDraft((current) => ({ ...current, ...patch }));
  const count = useMemo(() => applyFilters(ads, draft, query).length, [ads, draft, query]);
  const active = countActive(draft) > 0;

  return (
    <BottomSheet
      visible={visible}
      title="Фильтры"
      height={0.94}
      onClose={onClose}
      headerRight={
        <Pressable accessibilityRole="button" accessibilityLabel="Сбросить" disabled={!active} hitSlop={10} onPress={() => setDraft(emptyFilters())} style={({ pressed }) => ({ opacity: !active ? 0.35 : pressed ? 0.5 : 1 })}>
          <Text style={[type.subhead, { color: colors.textPrimary, fontWeight: '600' }]}>Сбросить</Text>
        </Pressable>
      }
    >
      <View style={styles.fill}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <SectionLabel>Категории</SectionLabel>
          {/* Плитки по размеру надписи, по две в ряду (2×2) */}
          <View style={styles.tiles}>
            {[FILTER_CATEGORIES.slice(0, 2), FILTER_CATEGORIES.slice(2, 4)].map((row, index) => (
              <View key={index} style={styles.tileRow}>
                {row.map((item) => {
                  const selected = draft.category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                      onPress={() => setDraft((current) => selectCategory(current, item.value))}
                      style={({ pressed }) => [styles.tile, { backgroundColor: selected ? colors.primary : colors.fill, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={[type.subhead, { color: selected ? colors.onPrimary : colors.textPrimary, fontWeight: '600' }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <SectionLabel>Общие</SectionLabel>
          <View>
            <View style={styles.pair}>
              <View style={styles.half}>
                <FloatingField label="Цена от" value={groupDigits(draft.priceFrom)} onChangeText={(text) => set({ priceFrom: digitsOf(text) })} keyboardType="number-pad" inputMode="numeric" suffix="₽" />
              </View>
              <View style={styles.half}>
                <FloatingField label="Цена до" value={groupDigits(draft.priceTo)} onChangeText={(text) => set({ priceTo: digitsOf(text) })} keyboardType="number-pad" inputMode="numeric" suffix="₽" />
              </View>
            </View>
            <GroupedFilterRow label="Район" groups={DISTRICT_GROUPS} keys={draft.districts.map((value) => `${value}|`)} onChange={(keys) => set({ districts: keys.map((key) => key.split('|')[0] as DistrictChoice) })} empty="Любой" />
            <CheckLine>
              <Checkbox compact label="Только с фото" checked={draft.withPhoto} onChange={(withPhoto) => set({ withPhoto })} />
            </CheckLine>
          </View>

          {/* Вещи */}
          <Collapsible show={draft.category === 'items'}>
            <View style={styles.block}>
              <SectionLabel>Вещи</SectionLabel>
              <View>
                <GroupedFilterRow label="Категория" groups={ITEM_CATEGORIES} keys={draft.itemKeys} onChange={(itemKeys) => set({ itemKeys })} />
                <FilterMultiRow label="Состояние" values={draft.condition} options={ITEM_CONDITIONS} onChange={(condition) => set({ condition })} />
                <CheckLine>
                  <Checkbox compact label="Договорная" checked={draft.negotiable} onChange={(negotiable) => set({ negotiable })} />
                </CheckLine>
              </View>
            </View>
          </Collapsible>

          {/* Жильё */}
          <Collapsible show={draft.category === 'housing'}>
            <View style={styles.block}>
              <SectionLabel>Жильё</SectionLabel>
              <View>
                <FilterMultiRow label="Что сдаётся" values={draft.housingType} options={HOUSING_TYPES} onChange={(housingType) => set({ housingType })} />
                <FilterMultiRow label="Срок" values={draft.term} options={RENT_TERM_CHOICES} onChange={(term) => set({ term })} />
                <FilterMultiRow label="Комнат" values={draft.rooms} options={ROOMS_COUNTS} onChange={(rooms) => set({ rooms })} />
                <View style={styles.pair}>
                  <View style={styles.half}>
                    <FloatingField label="Площадь от" value={draft.areaFrom} onChangeText={(text) => set({ areaFrom: digitsOf(text).slice(0, 4) })} keyboardType="number-pad" inputMode="numeric" suffix="м²" />
                  </View>
                  <View style={styles.half}>
                    <FloatingField label="до" value={draft.areaTo} onChangeText={(text) => set({ areaTo: digitsOf(text).slice(0, 4) })} keyboardType="number-pad" inputMode="numeric" suffix="м²" />
                  </View>
                </View>
                <FilterMultiRow label="С кем" values={draft.audience} options={AUDIENCES} onChange={(audience) => set({ audience })} />
                <FilterMultiRow label="Время до университета" values={draft.timeToUni} options={TIME_TO_UNI_FILTERS} onChange={(timeToUni) => set({ timeToUni })} />
                <FilterMultiRow label="Удобства" values={draft.amenities} options={AMENITIES} onChange={(amenities) => set({ amenities })} empty="Любые" />
                <CheckLine>
                  <Checkbox compact label="Коммунальные включены" checked={draft.utilitiesIncluded} onChange={(utilitiesIncluded) => set({ utilitiesIncluded })} />
                </CheckLine>
                <CheckLine>
                  <Checkbox compact label="Можно с животными" checked={draft.pets} onChange={(pets) => set({ pets })} />
                </CheckLine>
              </View>
            </View>
          </Collapsible>

          {/* Услуги */}
          <Collapsible show={draft.category === 'services'}>
            <View style={styles.block}>
              <SectionLabel>Услуги</SectionLabel>
              <View>
                <GroupedFilterRow label="Категория" groups={SERVICE_CATEGORIES} keys={draft.serviceKeys} onChange={(serviceKeys) => set({ serviceKeys, serviceAudience: asksAudienceIn(serviceKeys) ? draft.serviceAudience : [] })} />
                <Collapsible show={asksAudienceIn(draft.serviceKeys)}>
                  <FilterMultiRow label="Для кого" values={draft.serviceAudience} options={AUDIENCE_OPTIONS} onChange={(serviceAudience) => set({ serviceAudience })} />
                </Collapsible>
                <FilterMultiRow label="Формат" values={draft.serviceFormats} options={SERVICE_FORMATS} onChange={(serviceFormats) => set({ serviceFormats })} empty="Любой" />
                <FilterMultiRow label="Опыт" values={draft.serviceExperience} options={EXPERIENCE_OPTIONS} onChange={(serviceExperience) => set({ serviceExperience })} />
                <FilterMultiRow label="Когда удобно" values={draft.serviceTimes} options={TIME_OPTIONS} onChange={(serviceTimes) => set({ serviceTimes })} empty="Любое" last />
              </View>
            </View>
          </Collapsible>

          {/* Вакансии */}
          <Collapsible show={draft.category === 'jobs'}>
            <View style={styles.block}>
              <SectionLabel>Вакансии</SectionLabel>
              <View>
                <GroupedFilterRow label="Сфера" groups={JOB_FIELDS} keys={draft.jobKeys} onChange={(jobKeys) => set({ jobKeys })} />
                <FilterMultiRow label="Занятость" values={draft.employment} options={EMPLOYMENTS} onChange={(employment) => set({ employment })} empty="Любая" />
                <FilterMultiRow label="График" values={draft.schedule} options={SCHEDULE_OPTIONS} onChange={(schedule) => set({ schedule })} empty="Любой" />
                <FilterMultiRow label="Формат" values={draft.workFormat} options={WORK_FORMATS} onChange={(workFormat) => set({ workFormat })} />
                <FilterMultiRow label="Опыт" values={draft.jobExperience} options={JOB_EXPERIENCES} onChange={(jobExperience) => set({ jobExperience })} />
                <FloatingField label="Зарплата от" value={groupDigits(draft.salaryFrom)} onChangeText={(text) => set({ salaryFrom: digitsOf(text) })} keyboardType="number-pad" inputMode="numeric" suffix="₽" />
                <CheckLine>
                  <Checkbox compact label="Можно совмещать с учёбой" checked={draft.studyFriendly} onChange={(studyFriendly) => set({ studyFriendly })} />
                </CheckLine>
              </View>
            </View>
          </Collapsible>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showCountText(count)}
            onPress={() => onApply(draft)}
            style={({ pressed }) => [styles.apply, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text numberOfLines={1} style={[type.headline, { color: colors.onPrimary }]}>
              {showCountText(count)}
            </Text>
          </Pressable>
        </View>
      </View>

    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
  tiles: { gap: 8 },
  tileRow: { flexDirection: 'row', gap: 8 },
  tile: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 32, borderRadius: radius.control, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: 16 },
  half: { flex: 1 },
  block: { gap: 14, paddingTop: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
  apply: { minHeight: 50, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
