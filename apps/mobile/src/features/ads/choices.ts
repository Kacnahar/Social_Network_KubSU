// Выбор нескольких значений в окне: переключение одного значения с особым вариантом «Не указать»

// Переключает значение. exclusive — особый вариант («Не указать»): его выбор снимает все остальные галочки,
// а выбор любого другого снимает его. Результат в порядке списка options
export function toggleChoice<T extends string>(values: readonly T[], value: T, options: readonly { value: T }[], exclusive?: T): T[] {
  let next: T[];
  if (exclusive !== undefined && value === exclusive) {
    next = values.includes(value) ? [] : [value];
  } else {
    next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    if (exclusive !== undefined) next = next.filter((item) => item !== exclusive);
  }
  return options.map((option) => option.value).filter((item) => next.includes(item));
}
