export interface Occupancy {
  startTime: string;
  endTime: string;
}

export interface ApiRoom {
  name: string;
  occupancies: Occupancy[];
  details: {
    displayName: string | null;
    floor: string | null;
    floorLevel: number | null;
    building: { name: string } | null;
  };
}

export interface LectureEvent {
  name: string;
  startTime: string;
  endTime: string;
  rooms: string[];
  cancelled: boolean;
}

export class CourseNotFoundError extends Error {
  override name = 'CourseNotFoundError';
}

/** Requests that hang longer than this fail, so the app never waits forever. */
const TIMEOUT_MS = 15_000;

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
  if (!res.ok) return { status: res.status, body: null };
  return { status: res.status, body: await res.json() };
}

/** YYYY-MM-DD in the browser's local time zone. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── response validation ───────────────────────────────────────────────
// The APIs are third-party: entries that don't have the expected shape are
// dropped instead of crashing the app later.

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isTime = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));
const isOccupancy = (v: unknown): v is Occupancy => isObject(v) && isTime(v.startTime) && isTime(v.endTime);

export function isApiRoom(v: unknown): v is ApiRoom {
  if (!isObject(v) || !isString(v.name) || !Array.isArray(v.occupancies) || !isObject(v.details)) return false;
  const d = v.details;
  return (
    v.occupancies.every(isOccupancy) &&
    (d.displayName == null || isString(d.displayName)) &&
    (d.floor == null || isString(d.floor)) &&
    (d.floorLevel == null || Number.isInteger(d.floorLevel)) &&
    (d.building == null || (isObject(d.building) && isString(d.building.name)))
  );
}

/** Missing optional fields become null, so the rest of the app only deals with one "empty" value. */
const normalizeRoom = (r: ApiRoom): ApiRoom => ({
  ...r,
  details: {
    displayName: r.details.displayName ?? null,
    floor: r.details.floor ?? null,
    floorLevel: r.details.floorLevel ?? null,
    building: r.details.building ?? null,
  },
});

export function isLectureEvent(v: unknown): v is LectureEvent {
  return (
    isObject(v) &&
    isString(v.name) &&
    isTime(v.startTime) &&
    isTime(v.endTime) &&
    Array.isArray(v.rooms) &&
    v.rooms.every(isString) &&
    (v.cancelled === undefined || typeof v.cancelled === 'boolean')
  );
}

// ── endpoints ─────────────────────────────────────────────────────────

export async function fetchRooms(day: Date): Promise<ApiRoom[]> {
  const { status, body } = await getJson(`/api/rooms?date=${localDate(day)}`);
  if (!isObject(body) || !Array.isArray(body.rooms)) throw new Error(`Rooms request failed (${status})`);
  return body.rooms.filter(isApiRoom).map(normalizeRoom);
}

export async function fetchLectures(course: string): Promise<LectureEvent[]> {
  const { status, body } = await getJson(`/api/lectures/MA-${encodeURIComponent(course)}/events`);
  if (status === 404) throw new CourseNotFoundError(course);
  if (!Array.isArray(body)) throw new Error(`Timetable request failed (${status})`);
  return body.filter(isLectureEvent).map((e) => ({ ...e, cancelled: e.cancelled ?? false }));
}

export interface Course {
  /** Course ID without the `MA-` prefix, e.g. `TINF25IT1`. */
  id: string;
  degree: string;
}

/** All selectable Mannheim courses, sorted by ID. Used for autocomplete only. */
export async function fetchCourses(): Promise<Course[]> {
  const { status, body } = await getJson('/api/courses');
  if (!isObject(body)) throw new Error(`Course list request failed (${status})`);
  return parseCourses(body);
}

/** `{ <faculty>: { size: number, <degree>: ApiCourse[] } }` → courses. */
export function parseCourses(body: Record<string, unknown>): Course[] {
  const byId = new Map<string, Course>();
  for (const faculty of Object.values(body)) {
    if (!isObject(faculty)) continue;
    for (const list of Object.values(faculty)) {
      if (!Array.isArray(list)) continue;
      for (const c of list) {
        if (!isObject(c) || !isString(c.name) || c.visible !== true || c.hidden === true) continue;
        const m = /^MA-([A-Z0-9][A-Z0-9_-]*)$/i.exec(c.name);
        if (!m) continue;
        const id = m[1].toUpperCase();
        if (!byId.has(id)) byId.set(id, { id, degree: isString(c.degreeName) ? c.degreeName : '' });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
