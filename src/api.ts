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
