// Модуль историй: запросы к серверу
import {
  okResponseSchema,
  storiesResponseSchema,
  storyViewersResponseSchema,
  type CreateStoryRequest,
  type StoriesResponse,
  type StoryViewersResponse,
} from '@app/shared';
import { request } from '../../lib/api';

const id = encodeURIComponent;

export const getStories = (token: string): Promise<StoriesResponse> => request('/stories', storiesResponseSchema, { token });

export const createStory = (token: string, body: CreateStoryRequest) =>
  request('/stories', okResponseSchema, { method: 'POST', token, body });

export const markStoryViewed = (token: string, storyId: string) =>
  request(`/stories/${id(storyId)}/view`, okResponseSchema, { method: 'POST', token });

export const getStoryViewers = (token: string, storyId: string): Promise<StoryViewersResponse> =>
  request(`/stories/${id(storyId)}/viewers`, storyViewersResponseSchema, { token });

export const deleteStory = (token: string, storyId: string) =>
  request(`/stories/${id(storyId)}`, okResponseSchema, { method: 'DELETE', token });
