// Модуль комнат: запросы к серверу
import {
  joinRoomResponseSchema,
  okResponseSchema,
  roomPersonaResponseSchema,
  roomStateSchema,
  slotsResponseSchema,
  type JoinRoomResponse,
  type RoomPersonaResponse,
  type RoomReportRequest,
  type RoomState,
  type SlotsResponse,
  type VoteType,
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

export const getRoomState = (token: string, roomId: string): Promise<RoomState> =>
  request(`/rooms/${encodeURIComponent(roomId)}/state`, roomStateSchema, { token });

export const startVote = (token: string, roomId: string, type: VoteType, targetPersonaId: string) =>
  request(`/rooms/${encodeURIComponent(roomId)}/votes`, okResponseSchema, {
    method: 'POST',
    token,
    body: { type, targetPersonaId },
  });

export const castBallot = (token: string, voteId: string) =>
  request(`/rooms/votes/${encodeURIComponent(voteId)}/ballot`, okResponseSchema, { method: 'POST', token });

export const setPersonalMute = (token: string, personaId: string, muted: boolean) =>
  request(`/rooms/me/mutes/${encodeURIComponent(personaId)}`, okResponseSchema, {
    method: muted ? 'PUT' : 'DELETE',
    token,
  });

// «Поднять руку»: видят все в комнате
export const setHand = (token: string, roomId: string, raised: boolean) =>
  request(`/rooms/${encodeURIComponent(roomId)}/hand`, okResponseSchema, { method: raised ? 'PUT' : 'DELETE', token });

export const reportToAdmins = (token: string, body: RoomReportRequest) =>
  request('/rooms/reports', okResponseSchema, { method: 'POST', token, body });
