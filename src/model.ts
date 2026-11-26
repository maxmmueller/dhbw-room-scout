/**
 * Pure app logic (no DOM): what to show for a given timetable, room data and
 * time. Kept separate from main.ts so it can be unit-tested.
 */
import type { ApiRoom, Course, LectureEvent } from './api';
import { buildingLetter, dayContext, isAvailable, isRelevant, roomId, roomStatus, type Status } from './availability';
import { BUILDINGS } from './floorplan';

/** A building unit (index into BUILDINGS) and a floor level. */
export interface View {
  unit: number;
  level: number;
}

export interface Floor {
  level: number;
  /** Floor name from the API, e.g. "2. OG". */
  name: string;
  available: number;
  /** The user's lecture room (current / last / next) is on this floor. */
  hasOwn: boolean;
}

export interface Snapshot {
  /** Room id of the user's own room, if known. */
  location: string | null;
  /** Rooms to draw: all usable rooms plus the user's own room. */
  statuses: Map<string, Status>;
  /** Per building unit: its floors, lowest first. */
  floors: Floor[][];
  /** Where the own room is. */
  own: View | null;
}

/** Worth navigating to: something is free there, or it's where your lecture is. */
export const isUseful = (f: Floor) => f.available > 0 || f.hasOwn;

export function compute(rooms: ApiRoom[], events: LectureEvent[], now: Date): Snapshot {
  const ctx = dayContext(events, now);
  const statuses = new Map<string, Status>();
  const floors: Map<number, Floor>[] = BUILDINGS.map(() => new Map());
  let own: View | null = null;

  for (const room of rooms) {
    const letter = buildingLetter(room);
    const unit = BUILDINGS.findIndex((b) => letter !== null && b.letters.includes(letter));
    const level = room.details.floorLevel;
    if (unit < 0 || level === null) continue;

    let floor = floors[unit].get(level);
    if (!floor) {
      floor = { level, name: room.details.floor ?? `${level}`, available: 0, hasOwn: false };
      floors[unit].set(level, floor);
    }

    const id = roomId(room.name);
    const isOwn = id === ctx.location;
    if (isOwn) {
      own = { unit, level };
      floor.hasOwn = true;
    }
    if (!isRelevant(room) && !isOwn) continue;

    const s = roomStatus(room, now, ctx.freeUntilTarget);
    statuses.set(id, s);
    if (isRelevant(room) && isAvailable(s)) floor.available++;
  }

  return {
    location: ctx.location,
    statuses,
    floors: floors.map((m) => [...m.values()].sort((a, b) => a.level - b.level)),
    own,
  };
}

/** Same level if the unit has it, otherwise the closest existing one. */
export function closestLevel(floors: Floor[], level: number): number {
  if (floors.length === 0) return level;
  return floors.reduce((best, f) => (Math.abs(f.level - level) < Math.abs(best - level) ? f.level : best), floors[0].level);
}

/** English floor name for the title, e.g. "Ground floor", "1st floor". */
export function floorTitle(level: number): string {
  if (level === 0) return 'Ground floor';
  if (level < 0) return level === -1 ? 'Basement' : `Basement ${-level}`;
  const suffix = level % 100 >= 11 && level % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][level % 10] ?? 'th');
  return `${level}${suffix} floor`;
}

// ── courses ───────────────────────────────────────────────────────────
/** "  ma-tinf25it1 " → "TINF25IT1" */
export const normalizeCourse = (v: string) => v.trim().toUpperCase().replace(/^MA-/, '');

/** Prefix matches first, then matches anywhere in the ID. */
export function suggest(all: Course[], query: string, max: number): Course[] {
  const q = normalizeCourse(query);
  if (!q) return [];
  const prefix = all.filter((c) => c.id.startsWith(q));
  const inner = all.filter((c) => !c.id.startsWith(q) && c.id.includes(q));
  return [...prefix, ...inner].slice(0, max);
}
