import type { ActiveVote } from '@app/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../lib/api';
import { Button, Card, ErrorText } from '../../ui/components';
import { type, useColors } from '../../ui/theme';
import { castBallot } from './api';
import { secondsLeft, voteAboutMeText, voteBannerText } from './moderation';

type Props = {
  vote: ActiveVote;
  // Ник цели; null, если человека уже нет в списке
  targetName: string | null;
  token: string;
  onChanged: () => void;
  onUnauthorized: () => void;
};

// Карточка над списком участников, пока идёт голосование; кто голосовал, не показываем
export function VoteBanner({ vote, targetName, token, onChanged, onUnauthorized }: Props) {
  const colors = useColors();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [vote.voteId]);

  const support = async () => {
    setBusy(true);
    setError(null);
    try {
      await castBallot(token, vote.voteId);
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') onUnauthorized();
      else setError(caught instanceof Error ? caught.message : 'Не получилось проголосовать');
    } finally {
      setBusy(false);
    }
  };

  const seconds = secondsLeft(vote.endsAt, now);

  return (
    <Card>
      <Text accessibilityRole="header" style={[type.headline, { color: colors.text }]}>
        {vote.isAboutMe ? voteAboutMeText(vote.type) : voteBannerText(vote.type, targetName)}
      </Text>
      <View style={styles.counts}>
        <Text style={[type.subhead, { color: colors.muted }]}>
          За: {vote.votesFor} из {vote.votesNeeded}
        </Text>
        <Text accessibilityLabel={`Осталось ${seconds} секунд`} style={[type.subhead, { color: colors.muted }]}>
          {seconds} с
        </Text>
      </View>
      {vote.isAboutMe ? null : vote.iVoted ? (
        <Text style={[type.subhead, { color: colors.muted }]}>Вы проголосовали за</Text>
      ) : (
        <Button title="Поддержать" onPress={() => void support()} loading={busy} />
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', justifyContent: 'space-between' },
});
