import { can } from '@app/shared';
import { useSignedIn } from '../../lib/session';
import { ListScreen, Title } from '../../ui/components';
import { FeedList } from '../../features/feed/FeedList';
import { VoiceBar } from '../../features/rooms/VoiceBar';

export default function FeedScreen() {
  const { account } = useSignedIn();
  return (
    <ListScreen>
      <FeedList
        header={
          <>
            <Title>Лента</Title>
            {/* здесь будет ряд историй */}
          </>
        }
        // Запросы комнат уходят только у студента: у остальных строки войса нет вовсе
        pinned={can(account.role, 'rooms') ? <VoiceBar /> : undefined}
      />
    </ListScreen>
  );
}
