import { afterEach, describe, expect, it, vi } from 'vitest';
import { CourseNotFoundError, fetchLectures, fetchRooms, isApiRoom, localDate, parseCourses } from './api';

const json = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const validRoom = {
  name: '238B VL-Raum',
  occupancies: [{ startTime: '2026-11-26T08:00:00Z', endTime: '2026-11-26T10:00:00Z' }],
  details: { displayName: 'VL-Raum', floor: '2. OG', floorLevel: 2, building: { name: 'B-Gebäude' } },
};

afterEach(() => vi.unstubAllGlobals());

describe('localDate', () => {
  it('formats the local date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('isApiRoom', () => {
  it('accepts a valid room and tolerates missing optional details', () => {
    expect(isApiRoom(validRoom)).toBe(true);
    expect(isApiRoom({ ...validRoom, details: { displayName: 'VL-Raum' } })).toBe(true);
  });

  it('rejects malformed rooms', () => {
    expect(isApiRoom(null)).toBe(false);
    expect(isApiRoom({ ...validRoom, occupancies: 'x' })).toBe(false);
    expect(isApiRoom({ ...validRoom, occupancies: [{ startTime: 'nope', endTime: 'nope' }] })).toBe(false);
    expect(isApiRoom({ ...validRoom, details: { ...validRoom.details, floorLevel: '2' } })).toBe(false);
  });
});

describe('fetchRooms', () => {
  it('drops malformed rooms and fills in missing details', async () => {
    vi.stubGlobal('fetch', json({ rooms: [validRoom, { name: 42 }, { ...validRoom, details: {} }] }));
    const rooms = await fetchRooms(new Date(2026, 10, 26));
    expect(rooms).toHaveLength(2);
    expect(rooms[1].details).toEqual({ displayName: null, floor: null, floorLevel: null, building: null });
  });

  it('requests the given day', async () => {
    const fetch = json({ rooms: [] });
    vi.stubGlobal('fetch', fetch);
    await fetchRooms(new Date(2026, 10, 26));
    expect(fetch.mock.calls[0]).toEqual([expect.stringContaining('date=2026-11-26'), expect.anything()]);
  });

  it('fails on server errors and unexpected bodies', async () => {
    vi.stubGlobal('fetch', json({}, 500));
    await expect(fetchRooms(new Date())).rejects.toThrow('500');
    vi.stubGlobal('fetch', json({ unexpected: true }));
    await expect(fetchRooms(new Date())).rejects.toThrow();
  });
});

describe('fetchLectures', () => {
  it('reports unknown courses', async () => {
    vi.stubGlobal('fetch', json({}, 404));
    await expect(fetchLectures('NOPE')).rejects.toBeInstanceOf(CourseNotFoundError);
  });

  it('keeps valid events and defaults "cancelled"', async () => {
    const event = { name: 'Math', startTime: '2026-11-26T08:00:00Z', endTime: '2026-11-26T10:00:00Z', rooms: ['238B'] };
    vi.stubGlobal('fetch', json([event, { name: 'broken' }]));
    expect(await fetchLectures('TINF25IT1')).toEqual([{ ...event, cancelled: false }]);
  });
});

describe('parseCourses', () => {
  it('keeps visible Mannheim courses, without duplicates, sorted', () => {
    const body = {
      Technik: {
        size: 3,
        Informatik: [
          { name: 'MA-TINF25IT1', degreeName: 'Informatik', visible: true, hidden: false },
          { name: 'MA-TINF24AI1', degreeName: 'Informatik', visible: true, hidden: false },
          { name: 'MA-TINF25IT1', degreeName: 'Informatik', visible: true, hidden: false },
          { name: 'MA-OLD', degreeName: 'Informatik', visible: false, hidden: false },
          { name: 'KA-TINF25', degreeName: 'Informatik', visible: true, hidden: false },
        ],
      },
    };
    expect(parseCourses(body)).toEqual([
      { id: 'TINF24AI1', degree: 'Informatik' },
      { id: 'TINF25IT1', degree: 'Informatik' },
    ]);
  });
});
