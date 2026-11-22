import type { Slot } from '@app/shared';
import type { SlotsState } from './useSlots';

// Что показать про ближайшую комнату: одна логика для шара на вкладке «Войс» и строки в ленте
export type RoomsStatus = {
  // open — вход открыт, но комната ещё не началась; live — идёт сейчас; later — рано, ждём
  kind: 'loading' | 'none' | 'open' | 'live' | 'later';
  next?: Slot;
  now?: Date;
};

export function describeRooms(state: SlotsState): RoomsStatus {
  if (state.status === 'loading') return { kind: 'loading' };
  if (state.status === 'error') return { kind: 'none' };
  const next = state.slots[0];
  if (!next) return { kind: 'none' };
  if (next.joinable) return { kind: next.state === 'live' ? 'live' : 'open', next, now: state.now };
  return { kind: 'later', next, now: state.now };
}
