import type { ApiRoom, LectureEvent } from './api';
import { localDate } from './api';

export type Status = 'free' | 'soon' | 'busy' | 'locked';

const HOUR = 60 * 60 * 1000;
const RELEVANT_TYPE = /^(VL-\s?Raum|Hörsaal|Gruppenarbeitsraum)/;

/**
 * Rooms that can be locked. From experience, a lockable room is always
 * locked when no booking is using it, so it never counts as available.
 * The API doesn't expose this, so it's maintained by hand.
 */
export const LOCKABLE_ROOMS = new Set<string>([
  // e.g. '255B',
]);

/** "238B VL-Raum Unterrichtsraum" → "238B" */
export const roomId = (apiName: string): string => apiName.split(' ')[0];

export function isRelevant(room: ApiRoom): boolean {
  return RELEVANT_TYPE.test(room.details.displayName ?? '');
}

/** Main campus buildings A/B/C at Coblitzallee. */
export function isMainCampus(room: ApiRoom): boolean {
  return room.details.building?.name.includes('Coblitzallee') ?? false;
}

export interface DayContext {
  /** Room id of the user's current / last / upcoming lecture today. */
  location: string | null;
  /** A room is "free" (green) if it stays free until this moment. */
  freeUntilTarget: Date;
}

export function dayContext(events: LectureEvent[], now: Date): DayContext {
  const today = localDate(now);
  const lectures = events
    .filter((e) => !e.cancelled && localDate(new Date(e.startTime)) === today)
    .map((e) => ({ ...e, start: new Date(e.startTime), end: new Date(e.endTime) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const current = lectures.find((l) => l.start <= now && now < l.end);
  const last = lectures.filter((l) => l.end <= now).at(-1);
  const next = lectures.find((l) => l.start > now);

  // current lecture → last finished lecture → first upcoming lecture
  const anchor = current ?? last ?? next;
  return {
    location: anchor?.rooms[0] ? roomId(anchor.rooms[0]) : null,
    freeUntilTarget: next ? next.start : new Date(now.getTime() + HOUR),
  };
}

export function roomStatus(room: ApiRoom, now: Date, target: Date): Status {
  const slots = room.occupancies.map((o) => ({
    start: new Date(o.startTime),
    end: new Date(o.endTime),
  }));
  if (slots.some((s) => s.start <= now && now < s.end)) return 'busy';
  if (LOCKABLE_ROOMS.has(roomId(room.name))) return 'locked';

  const nextBooking = slots
    .filter((s) => s.start > now)
    .reduce<Date | null>((min, s) => (!min || s.start < min ? s.start : min), null);
  return !nextBooking || nextBooking >= target ? 'free' : 'soon';
}

export const isAvailable = (s: Status) => s === 'free' || s === 'soon';
