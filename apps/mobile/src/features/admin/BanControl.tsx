import { useState } from 'react';
import { Body, Button } from '../../ui/components';
import { Segmented } from '../../ui/Segmented';

type Props = {
  options: { value: string; label: string }[];
  startTitle: string;
  confirmTitle: string;
  hint?: string;
  busy: boolean;
  // Любое другое действие карточки в процессе: кнопки блокируем
  disabled: boolean;
  onConfirm: (days: number) => void;
};

// Кнопка → выбор срока → «Запретить» / «Отмена»; общий для карточек комнат и записей
export function BanControl({ options, startTitle, confirmTitle, hint, busy, disabled, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(options[0]?.value ?? '1');

  if (!open) return <Button variant="plainDanger" title={startTitle} onPress={() => setOpen(true)} disabled={disabled} />;
  return (
    <>
      <Segmented options={options} value={days} onChange={setDays} />
      {hint ? <Body muted>{hint}</Body> : null}
      <Button variant="danger" title={confirmTitle} onPress={() => onConfirm(Number(days))} loading={busy} disabled={disabled} />
      <Button variant="plain" title="Отмена" onPress={() => setOpen(false)} disabled={disabled} />
    </>
  );
}
