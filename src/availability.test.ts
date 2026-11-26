import { describe, expect, it } from 'vitest';
import type { ApiRoom, LectureEvent } from './api';
import { buildingLetter, dayContext, isRelevant, roomId, roomStatus } from './availability';

/** Local time today-ish: 2026-11-26 at hh:mm. */
const at = (h: number, m = 0) => new Date(2026, 10, 26, h, m);
const iso = (h: number, m = 0) => at(h, m).toISOString();

const lecture = (from: number, to: number, room: string, extra: Partial<LectureEvent> = {}): LectureEvent => ({
  name: 'Lecture',
  startTime: iso(from),
  endTime: iso(to),
  rooms: [room],
  cancelled: false,
  ...extra,
});

const room = (name: string, bookings: [number, number][] = [], displayName = 'VL-Raum Unterrichtsraum'): ApiRoom => ({
  name,
  occupancies: bookings.map(([s, e]) => ({ startTime: iso(s), endTime: iso(e) })),
  details: { displayName, floor: '2. OG', floorLevel: 2, building: { name: 'B-Gebäude, Coblitzallee 1-9' } },
});

describe('roomId / isRelevant / buildingLetter', () => {
  it('takes the room number from the API name', () => {
    expect(roomId('238B VL-Raum Unterrichtsraum')).toBe('238B');
  });

  it('only counts lecture rooms, lecture halls and group rooms as usable', () => {
    expect(isRelevant(room('1', [], 'VL-Raum Unterrichtsraum'))).toBe(true);
    expect(isRelevant(room('1', [], 'Hörsaal'))).toBe(true);
    expect(isRelevant(room('1', [], 'Gruppenarbeitsraum'))).toBe(true);
    expect(isRelevant(room('1', [], 'Büro'))).toBe(false);
  });

  it('reads the building letter and ignores other sites', () => {
    expect(buildingLetter(room('1'))).toBe('B');
    const elsewhere = { ...room('1'), details: { ...room('1').details, building: { name: 'Käfertaler Straße' } } };
    expect(buildingLetter(elsewhere)).toBeNull();
  });
});

describe('dayContext', () => {
  const events = [lecture(8, 10, '238B'), lecture(13, 15, '150C')];

  it('uses the current lecture as location and the next one as target', () => {
    const ctx = dayContext(events, at(9));
    expect(ctx.location).toBe('238B');
    expect(ctx.freeUntilTarget).toEqual(at(13));
  });

  it('falls back to the last finished lecture between lectures', () => {
    expect(dayContext(events, at(11)).location).toBe('238B');
  });

  it('uses the next lecture before the first one starts', () => {
    expect(dayContext(events, at(7)).location).toBe('238B');
  });

  it('targets one hour from now after the last lecture', () => {
    const ctx = dayContext(events, at(16));
    expect(ctx.location).toBe('150C');
    expect(ctx.freeUntilTarget).toEqual(at(17));
  });

  it('ignores cancelled lectures and other days', () => {
    const other = { ...lecture(9, 10, '999X'), startTime: new Date(2026, 10, 25, 9).toISOString() };
    const ctx = dayContext([lecture(8, 10, '111A', { cancelled: true }), other], at(9));
    expect(ctx.location).toBeNull();
  });
});

describe('roomStatus', () => {
  it('is busy while booked', () => {
    expect(roomStatus(room('238B', [[9, 11]]), at(10), at(13))).toBe('busy');
  });

  it('is free when not booked before the target', () => {
    expect(roomStatus(room('238B', [[14, 15]]), at(10), at(13))).toBe('free');
    expect(roomStatus(room('238B'), at(10), at(13))).toBe('free');
  });

  it('is soon when booked before the target', () => {
    expect(roomStatus(room('238B', [[12, 13]]), at(10), at(13))).toBe('soon');
  });

  it('treats a booking ending exactly now as over', () => {
    expect(roomStatus(room('238B', [[8, 10]]), at(10), at(13))).toBe('free');
  });
});
