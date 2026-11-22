import { describe, expect, it } from 'vitest';
import { kickVotesNeeded, voteIsPossible, votesNeeded } from './moderation';

describe('пороги голосований', () => {
  it('«выгнать»: таблица из правил модерации', () => {
    const table: [number, number][] = [
      [4, 3], [9, 3], [10, 4], [12, 4], [13, 5], [15, 5], [16, 6], [18, 6], [19, 7], [21, 7], [22, 8], [24, 8], [25, 9],
    ];
    for (const [participants, needed] of table) expect(kickVotesNeeded(participants), `участников ${participants}`).toBe(needed);
  });

  it('«выключить микрофон»: всегда 2 голоса', () => {
    expect([votesNeeded('mute', 3), votesNeeded('mute', 25)]).toEqual([2, 2]);
  });

  it('втроём выгнать нельзя, вчетвером — можно; заглушить можно уже втроём', () => {
    expect([voteIsPossible('kick', 2), voteIsPossible('kick', 3), voteIsPossible('kick', 4)]).toEqual([false, false, true]);
    expect([voteIsPossible('mute', 2), voteIsPossible('mute', 3)]).toEqual([false, true]);
  });
});
