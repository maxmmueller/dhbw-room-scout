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

export class CourseNotFoundError extends Error {}

/** YYYY-MM-DD in the browser's local time zone. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function fetchRooms(day: Date): Promise<ApiRoom[]> {
  const res = await fetch(`/api/rooms?date=${localDate(day)}`);
  if (!res.ok) throw new Error(`Rooms request failed (${res.status})`);
  const body = (await res.json()) as { rooms: ApiRoom[] };
  return body.rooms;
}

export async function fetchLectures(course: string): Promise<LectureEvent[]> {
  const res = await fetch(`/api/lectures/MA-${encodeURIComponent(course)}/events`);
  if (res.status === 404) throw new CourseNotFoundError(course);
  if (!res.ok) throw new Error(`Timetable request failed (${res.status})`);
  return (await res.json()) as LectureEvent[];
}

export interface Course {
  /** Course ID without the `MA-` prefix, e.g. `TINF25IT1`. */
  id: string;
  degree: string;
}

interface ApiCourse {
  name: string;
  degreeName: string;
  visible: boolean;
  hidden: boolean;
}

/** All selectable Mannheim courses, sorted by ID. Used for autocomplete only. */
export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch('/api/courses');
  if (!res.ok) throw new Error(`Course list request failed (${res.status})`);
  // { <faculty>: { size: number, <degree>: ApiCourse[] } }
  const body = (await res.json()) as Record<string, Record<string, ApiCourse[] | number>>;
  const byId = new Map<string, Course>();
  for (const faculty of Object.values(body)) {
    for (const list of Object.values(faculty)) {
      if (!Array.isArray(list)) continue;
      for (const c of list) {
        const m = /^MA-([A-Z0-9][A-Z0-9_-]*)$/i.exec(c.name);
        if (!m || !c.visible || c.hidden) continue;
        const id = m[1].toUpperCase();
        if (!byId.has(id)) byId.set(id, { id, degree: c.degreeName });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
