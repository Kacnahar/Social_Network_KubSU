import { ROOM_REPORT_MAX, type VoteType } from '@app/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../lib/api';
import { Button, ErrorText, Field } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { reportToAdmins, setPersonalMute, startVote } from './api';
import { VOTE_BUSY_HINT, kickButtonTitle, voteHint } from './moderation';
import type { CallParticipant } from './voiceTypes';

type Mode = 'idle' | 'confirm' | 'report' | 'reported';

type Props = {
  participant: CallParticipant;
  roomId: string;
  token: string;
  // Сколько людей в комнате сейчас — от этого зависят пороги
  total: number;
  voteActive: boolean;
  // Состояние комнаты нужно обновить сразу после моего действия
  onChanged: () => void;
  onUnauthorized: () => void;
};

// Панель действий под строкой участника: без модальных окон, ошибки сервера — здесь же
export function ParticipantActions({ participant, roomId, token, total, voteActive, onChanged, onUnauthorized }: Props) {
  const colors = useColors();
  const [mode, setMode] = useState<Mode>('idle');
  const [pending, setPending] = useState<VoteType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  const run = async (action: () => Promise<unknown>, done: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      done();
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') onUnauthorized();
      else setError(caught instanceof Error ? caught.message : 'Не получилось. Попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  const toggleMute = () => void run(() => setPersonalMute(token, participant.id, !participant.isLocallyMuted), () => undefined);
  const confirmVote = () => {
    if (!pending) return;
    void run(
      () => startVote(token, roomId, pending, participant.id),
      () => {
        setMode('idle');
        setPending(null);
      },
    );
  };
  const sendReport = () =>
    void run(
      () => reportToAdmins(token, { targetPersonaId: participant.id, roomId, text: text.trim() }),
      () => {
        setMode('reported');
        setText('');
      },
    );

  const askVote = (kind: VoteType) => {
    setPending(kind);
    setMode('confirm');
    setError(null);
  };

  const hintStyle = [type.footnote, { color: colors.muted }];

  if (mode === 'confirm' && pending) {
    return (
      <View style={styles.panel}>
        <Text style={[type.headline, { color: colors.text }]}>Начать голосование?</Text>
        <Button title="Да, начать" variant={pending === 'kick' ? 'danger' : 'secondary'} onPress={confirmVote} loading={busy} />
        <Button title="Отмена" variant="plain" disabled={busy} onPress={() => setMode('idle')} />
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }

  if (mode === 'report') {
    return (
      <View style={styles.panel}>
        <Field
          label="Что случилось"
          value={text}
          onChangeText={setText}
          maxLength={ROOM_REPORT_MAX}
          multiline
          autoCapitalize="sentences"
          autoCorrect
        />
        <Button title="Отправить" variant="secondary" onPress={sendReport} loading={busy} disabled={text.trim().length === 0} />
        <Button title="Отмена" variant="plain" disabled={busy} onPress={() => setMode('idle')} />
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }

  const mute = voteHint('mute', total);
  const kick = voteHint('kick', total);

  return (
    <View style={styles.panel}>
      <Button
        title={participant.isLocallyMuted ? 'Вернуть звук' : 'Заглушить для себя'}
        variant="secondary"
        onPress={toggleMute}
        loading={busy}
      />

      <View style={styles.group}>
        <Button title="Выключить микрофон" variant="secondary" disabled={voteActive || !mute.possible || busy} onPress={() => askVote('mute')} />
        <Text style={hintStyle}>{voteActive ? VOTE_BUSY_HINT : mute.text}</Text>
      </View>

      <View style={styles.group}>
        <Button title={kickButtonTitle()} variant="plainDanger" disabled={voteActive || !kick.possible || busy} onPress={() => askVote('kick')} />
        <Text style={hintStyle}>{voteActive ? VOTE_BUSY_HINT : kick.text}</Text>
      </View>

      {mode === 'reported' ? (
        <Text accessibilityLiveRegion="polite" style={[type.subhead, { color: colors.success }]}>
          Спасибо, мы посмотрим
        </Text>
      ) : (
        <Button title="Пожаловаться админам" variant="plain" onPress={() => setMode('report')} />
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10, paddingBottom: 12 },
  group: { gap: 2 },
});
