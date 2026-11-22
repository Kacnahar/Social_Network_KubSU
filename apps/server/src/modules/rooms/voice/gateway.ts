import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import type { VoiceConfig } from '../../../config';

export interface VoiceGateway {
  // Адрес сервера звука, который получает приложение
  readonly url: string;
  // canPublish: false — человек входит без права говорить (у него выключен микрофон по голосованию)
  createToken(input: { roomName: string; identity: string; name: string; ttlSeconds: number; canPublish?: boolean }): Promise<string>;
  // Сколько человек сейчас в комнате; 0, если комнаты на сервере звука ещё нет
  countParticipants(roomName: string): Promise<number>;
  closeRoom(roomName: string): Promise<void>;
  // Идентификаторы (personaId) тех, кто сейчас на связи; пусто, если комнаты нет
  listIdentities(roomName: string): Promise<string[]>;
  // Разрешить или запретить человеку говорить
  setCanPublish(roomName: string, identity: string, canPublish: boolean): Promise<void>;
  // Отключить человека от комнаты
  removeParticipant(roomName: string, identity: string): Promise<void>;
}

const isNotFound = (error: unknown) =>
  (error as { code?: string }).code === 'not_found' || (error as { status?: number }).status === 404;

export function createLiveKitGateway(config: VoiceConfig): VoiceGateway {
  const api = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);

  return {
    url: config.url,

    async createToken({ roomName, identity, name, ttlSeconds, canPublish = true }) {
      const token = new AccessToken(config.apiKey, config.apiSecret, { identity, name, ttl: Math.ceil(ttlSeconds) });
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish,
        // Только звук с микрофона: ни видео, ни экрана, ни произвольных данных
        canPublishSources: [TrackSource.MICROPHONE],
        canPublishData: false,
      });
      return token.toJwt();
    },

    async countParticipants(roomName) {
      try {
        return (await api.listParticipants(roomName)).length;
      } catch (error) {
        if (isNotFound(error)) return 0;
        throw error;
      }
    },

    async listIdentities(roomName) {
      try {
        return (await api.listParticipants(roomName)).map((participant) => participant.identity);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },

    async setCanPublish(roomName, identity, canPublish) {
      try {
        await api.updateParticipant(roomName, identity, undefined, {
          canSubscribe: true,
          canPublish,
          canPublishSources: [TrackSource.MICROPHONE],
          canPublishData: false,
        });
      } catch (error) {
        // Человек уже вышел — менять нечего
        if (!isNotFound(error)) throw error;
      }
    },

    async removeParticipant(roomName, identity) {
      try {
        await api.removeParticipant(roomName, identity);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },

    async closeRoom(roomName) {
      try {
        await api.deleteRoom(roomName);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
  };
}
