// Модуль комнат: запросы к серверу
import {
  joinRoomResponseSchema,
  okResponseSchema,
  roomPersonaResponseSchema,
  slotsResponseSchema,
  type JoinRoomResponse,
  type RoomPersonaResponse,
  type SlotsResponse,
} from '@app/shared';
import { request } from '../../lib/api';

export const getPersona = (token: string): Promise<RoomPersonaResponse> =>
  request('/rooms/me', roomPersonaResponseSchema, { token });

export const setNickname = (token: string, nickname: string): Promise<RoomPersonaResponse> =>
  request('/rooms/me/nickname', roomPersonaResponseSchema, { method: 'PUT', token, body: { nickname } });

export const getSlots = (token: string): Promise<SlotsResponse> => request('/rooms/slots', slotsResponseSchema, { token });

export const joinRoom = (token: string, slotId: string): Promise<JoinRoomResponse> =>
  request(`/rooms/slots/${encodeURIComponent(slotId)}/join`, joinRoomResponseSchema, { method: 'POST', token });

export const leaveRoom = (token: string, roomId: string) =>
  request(`/rooms/${encodeURIComponent(roomId)}/leave`, okResponseSchema, { method: 'POST', token });
