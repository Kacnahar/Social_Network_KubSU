import { describe, expect, it } from 'vitest';
import type { Gif } from '../gif/gifs';
import { GIF_PLACEHOLDER, commentGifOf, rememberCommentGif, visibleCommentText } from './commentGifs';

const gif: Gif = { id: 'g', title: 'Ура', previewUrl: null, url: null, width: 200, height: 200 };

describe('GIF в комментариях', () => {
  it('запоминает GIF по номеру комментария', () => {
    expect(commentGifOf('c1')).toBeNull();
    rememberCommentGif('c1', gif);
    expect(commentGifOf('c1')).toEqual(gif);
  });

  it('прячет текст-заглушку, только когда GIF прикреплён', () => {
    expect(visibleCommentText(GIF_PLACEHOLDER, gif)).toBe('');
    expect(visibleCommentText(GIF_PLACEHOLDER, null)).toBe(GIF_PLACEHOLDER);
    expect(visibleCommentText('Привет', gif)).toBe('Привет');
  });
});
