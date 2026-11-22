// Модуль ленты: запросы к серверу
import { postsPageSchema, type PostsPage } from '@app/shared';
import { request } from '../../lib/api';

export const getFeed = (token: string, before?: string | null): Promise<PostsPage> =>
  request(`/feed${before ? `?before=${encodeURIComponent(before)}` : ''}`, postsPageSchema, { token });
