// Модуль постов: запросы к серверу
import {
  commentSchema,
  commentsPageSchema,
  likeResponseSchema,
  okResponseSchema,
  postSchema,
  postsPageSchema,
  type Comment,
  type Gif,
  type CommentsPage,
  type CreatePostRequest,
  type LikeResponse,
  type Post,
  type PostsPage,
} from '@app/shared';
import { request } from '../../lib/api';

const id = encodeURIComponent;

export const createPost = (token: string, body: CreatePostRequest): Promise<Post> =>
  request('/posts', postSchema, { method: 'POST', token, body });

export const getPost = (token: string, postId: string): Promise<Post> => request(`/posts/${id(postId)}`, postSchema, { token });

export const deletePost = (token: string, postId: string) =>
  request(`/posts/${id(postId)}`, okResponseSchema, { method: 'DELETE', token });

export const likePost = (token: string, postId: string): Promise<LikeResponse> =>
  request(`/posts/${id(postId)}/like`, likeResponseSchema, { method: 'PUT', token });

export const unlikePost = (token: string, postId: string): Promise<LikeResponse> =>
  request(`/posts/${id(postId)}/like`, likeResponseSchema, { method: 'DELETE', token });

export const getComments = (token: string, postId: string, after?: string | null): Promise<CommentsPage> =>
  request(`/posts/${id(postId)}/comments${after ? `?after=${encodeURIComponent(after)}` : ''}`, commentsPageSchema, { token });

// gif — GIF, выбранный в окне GIF; комментарий может состоять из одного GIF, без текста
export const addComment = (token: string, postId: string, text: string, gif?: Gif): Promise<Comment> =>
  request(`/posts/${id(postId)}/comments`, commentSchema, { method: 'POST', token, body: { text, gif } });

export const deleteComment = (token: string, commentId: string) =>
  request(`/posts/comments/${id(commentId)}`, okResponseSchema, { method: 'DELETE', token });

export const getProfilePosts = (token: string, profileId: string, before?: string | null): Promise<PostsPage> =>
  request(`/profiles/${id(profileId)}/posts${before ? `?before=${encodeURIComponent(before)}` : ''}`, postsPageSchema, { token });

export const reportPost = (token: string, postId: string, reason = '') =>
  request(`/posts/${id(postId)}/report`, okResponseSchema, { method: 'POST', token, body: { reason } });

export const reportComment = (token: string, commentId: string, reason = '') =>
  request(`/posts/comments/${id(commentId)}/report`, okResponseSchema, { method: 'POST', token, body: { reason } });
