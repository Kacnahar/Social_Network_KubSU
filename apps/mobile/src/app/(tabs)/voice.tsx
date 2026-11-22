import { Body, Screen, Title } from '../../ui/components';
import { VoiceMenu } from '../../features/rooms/VoiceMenu';

export default function VoiceScreen() {
  return (
    <Screen align="top">
      <Title>Анонимный войс</Title>
      <Body muted>В комнате вас видят только под ником. Имя, фото и профиль собеседники не узнают.</Body>
      <VoiceMenu />
    </Screen>
  );
}
