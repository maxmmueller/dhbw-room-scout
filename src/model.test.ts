import { describe, expect, it } from 'vitest';
import type { ApiRoom, LectureEvent } from './api';
import { closestLevel, compute, floorTitle, isUseful, normalizeCourse, suggest, type Floor } from './model';
import { renderFloor } from './render';

const at = (h: number) => new Date(2026, 10, 26, h);
const iso = (h: number) => at(h).toISOString();

const room = (name: string, level: number, letter = 'B', displayName = 'VL-Raum', booked: [number, number][] = []): ApiRoom => ({
  name,
  occupancies: booked.map(([s, e]) => ({ startTime: iso(s), endTime: iso(e) })),
  details: { displayName, floor: `${level}. OG`, floorLevel: level, building: { name: `${letter}-Gebäude` } },
});

const floor = (level: number, available = 0, hasOwn = false): Floor => ({ level, name: `${level}`, available, hasOwn });

describe('compute', () => {
  const rooms = [
    room('238B VL-Raum', 2),
    room('239B VL-Raum', 2, 'B', 'VL-Raum', [[9, 11]]),
    room('120C Büro', 1, 'C', 'Büro'),
    room('050A VL-Raum', 0, 'A'),
    room('999X VL-Raum', 1, 'X'), // other site: ignored
  ];
  const events: LectureEvent[] = [
    { name: 'Math', startTime: iso(9), endTime: iso(11), rooms: ['120C Büro'], cancelled: false },
  ];
  const snap = compute(rooms, events, at(10));

  it('groups floors per building unit, lowest first', () => {
    expect(snap.floors[0].map((f) => f.level)).toEqual([1, 2]); // B/C
    expect(snap.floors[1].map((f) => f.level)).toEqual([0]); // A
  });

  it('counts available usable rooms per floor', () => {
    expect(snap.floors[0].find((f) => f.level === 2)?.available).toBe(1);
  });

  it('always includes the own room, even if it is not a usable room type', () => {
    expect(snap.location).toBe('120C');
    expect(snap.own).toEqual({ unit: 0, level: 1 });
    expect(snap.statuses.has('120C')).toBe(true);
    expect(snap.floors[0][0].hasOwn).toBe(true);
    expect(snap.floors[0][0].available).toBe(0); // the own (busy, non-usable) room doesn't count
  });
});

describe('navigation helpers', () => {
  it('finds the closest existing level', () => {
    const floors = [floor(0), floor(1), floor(3)];
    expect(closestLevel(floors, 3)).toBe(3);
    expect(closestLevel(floors, 2)).toBe(1);
    expect(closestLevel(floors, 6)).toBe(3);
    expect(closestLevel([], 4)).toBe(4);
  });

  it('marks floors with free rooms or the own room as useful', () => {
    expect(isUseful(floor(1, 0))).toBe(false);
    expect(isUseful(floor(1, 2))).toBe(true);
    expect(isUseful(floor(1, 0, true))).toBe(true);
  });

  it('names floors in English', () => {
    expect([-2, -1, 0, 1, 2, 3, 4, 11].map(floorTitle)).toEqual([
      'Basement 2',
      'Basement',
      'Ground floor',
      '1st floor',
      '2nd floor',
      '3rd floor',
      '4th floor',
      '11th floor',
    ]);
  });
});

describe('courses', () => {
  const all = ['TINF25IT1', 'TINF25AI1', 'WWI25A', 'BWL-TINF'].map((id) => ({ id, degree: '' }));

  it('normalizes input', () => {
    expect(normalizeCourse('  ma-tinf25it1 ')).toBe('TINF25IT1');
  });

  it('suggests prefix matches first, then inner matches', () => {
    expect(suggest(all, 'tinf', 10).map((c) => c.id)).toEqual(['TINF25IT1', 'TINF25AI1', 'BWL-TINF']);
    expect(suggest(all, 'tinf', 1)).toHaveLength(1);
    expect(suggest(all, '  ', 10)).toEqual([]);
  });
});

describe('renderFloor', () => {
  const plan = {
    footprint: [{ x0: 0, y0: 0, x1: 400, y1: 300 }],
    corridors: [],
    restricted: [],
    rooms: [
      { id: '101B', x0: 0, y0: 0, x1: 100, y1: 100 },
      { id: '102B', x0: 100, y0: 0, x1: 200, y1: 100 },
      { id: '103B', x0: 200, y0: 0, x1: 300, y1: 100 },
    ],
  };
  const statuses = new Map([
    ['101B', 'free'],
    ['102B', 'busy'],
  ] as const);

  it('draws only rooms that have a status', () => {
    const svg = renderFloor(plan, new Map(statuses), null);
    expect(svg).toContain('>101B<');
    expect(svg).toContain('>102B<');
    expect(svg).not.toContain('>103B<');
  });

  it('describes the rooms for screen readers', () => {
    const svg = renderFloor(plan, new Map(statuses), '102B');
    expect(svg).toContain('aria-label="Floor plan. Free: 101B. Taken: 102B. Your room: 102B."');
  });

  it('shows a note for floors that are not mapped yet', () => {
    expect(renderFloor({ ...plan, rooms: null }, new Map(), null)).toContain('Plan not mapped yet');
  });
});
