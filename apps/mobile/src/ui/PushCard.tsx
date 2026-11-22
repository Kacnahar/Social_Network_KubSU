import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { disablePush, enablePush, getPushStatus, type PushStatus } from '../lib/push';
import { Body, Button, Card, CardTitle, ErrorText } from './components';

const unsupportedText =
  Platform.OS === 'web'
    ? 'Этот браузер не поддерживает уведомления. На iPhone добавьте сайт на экран «Домой»'
    : 'Напоминания в приложении появятся позже';

export function PushCard({ token, disabled = false }: { token: string; disabled?: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPushStatus().then((next) => {
      if (!active) return;
      setStatus(next);
      // Подписка в браузере могла остаться от другого аккаунта или пропасть на сервере — тихо записываем заново
      if (next === 'on') void enablePush(token).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const toggle = useCallback(
    async (enable: boolean) => {
      setError(null);
      setBusy(true);
      try {
        if (enable) setStatus(await enablePush(token));
        else {
          await disablePush(token);
          setStatus(await getPushStatus());
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  if (status === null) return null;
  return (
    <Card>
      <CardTitle>Напоминания</CardTitle>
      {status === 'on' && (
        <>
          <Body muted>Напоминания включены: за час и за 5 минут до комнаты</Body>
          <Button variant="secondary" title="Выключить" onPress={() => void toggle(false)} loading={busy} disabled={disabled} />
        </>
      )}
      {status === 'off' && (
        <Button variant="secondary" title="Включить напоминания" onPress={() => void toggle(true)} loading={busy} disabled={disabled} />
      )}
      {status === 'blocked' && (
        <Body muted>Уведомления запрещены в настройках браузера. Разрешите их для этого сайта и обновите страницу</Body>
      )}
      {status === 'unsupported' && <Body muted>{unsupportedText}</Body>}
      {status === 'unavailable' && <Body muted>Напоминания временно недоступны</Body>}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
