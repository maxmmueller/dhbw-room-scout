import './style.css';
import { CourseNotFoundError, fetchLectures, fetchRooms, type ApiRoom, type LectureEvent } from './api';
import { dayContext, isAvailable, isMainCampus, isRelevant, roomId, roomStatus, type Status } from './availability';
import { EMPTY_PLAN, FLOOR_PLANS } from './floorplan';
import { ICONS, renderFloor } from './render';

const app = document.getElementById('app')!;
const COOKIE = 'course';
const REFRESH_MS = 60_000;
const REFETCH_MS = 5 * 60_000;

// ── cookie ────────────────────────────────────────────────────────────
const getCourse = () => document.cookie.match(/(?:^|; )course=([^;]+)/)?.[1] ?? null;
const setCourse = (c: string) =>
  (document.cookie = `${COOKIE}=${encodeURIComponent(c)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`);
const clearCourse = () => (document.cookie = `${COOKIE}=; max-age=0; path=/`);

/** `?now=2026-11-18T12:00` overrides the clock (demo/testing only). */
function now(): Date {
  const override = new URLSearchParams(location.search).get('now');
  const d = override ? new Date(override) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// ── onboarding ────────────────────────────────────────────────────────
function showOnboarding(error = '') {
  app.innerHTML = `
    <form class="onboarding" novalidate>
      <div class="field${error ? ' invalid' : ''}">
        <input name="course" autocomplete="off" autocapitalize="characters" spellcheck="false"
          placeholder="e.g. TINF25IT1" aria-label="Course ID" aria-invalid="${!!error}" />
        <button type="submit" aria-label="Continue">
          <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5"/></svg>
        </button>
      </div>
      <p class="error" role="alert">${error}</p>
    </form>`;
  const form = app.querySelector('form')!;
  const input = form.querySelector('input')!;
  input.focus();
  input.addEventListener('input', () => form.querySelector('.field')!.classList.remove('invalid'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const course = input.value.trim().toUpperCase().replace(/^MA-/, '');
    if (!course) return;
    form.classList.add('loading');
    try {
      const events = await fetchLectures(course);
      setCourse(course);
      start(course, events);
    } catch (err) {
      showOnboarding(err instanceof CourseNotFoundError ? 'Course not found' : 'Connection problem – try again');
      (app.querySelector('input') as HTMLInputElement).value = course;
    }
  });
}

// ── main screen ───────────────────────────────────────────────────────
interface Floor {
  level: number;
  name: string;
  available: number;
}

interface State {
  course: string;
  events: LectureEvent[];
  rooms: ApiRoom[];
  floor: number | null;
}

function compute(state: State) {
  const t = now();
  const ctx = dayContext(state.events, t);
  const campus = state.rooms.filter(isMainCampus);
  const statuses = new Map<string, Status>();
  const floors = new Map<number, Floor>();

  for (const room of campus) {
    const level = room.details.floorLevel;
    if (level === null) continue;
    const floor = floors.get(level) ?? { level, name: room.details.floor ?? `${level}`, available: 0 };
    floors.set(level, floor);
    if (!isRelevant(room)) continue;
    const s = roomStatus(room, t, ctx.freeUntilTarget);
    statuses.set(roomId(room.name), s);
    if (isAvailable(s)) floor.available++;
  }

  const locationLevel = campus.find((r) => roomId(r.name) === ctx.location)?.details.floorLevel;
  const defaultFloor = locationLevel ?? 0;
  return { ctx, statuses, floors: [...floors.values()].sort((a, b) => a.level - b.level), defaultFloor };
}

const chevron = (dir: 'up' | 'down') =>
  `<svg class="chev" viewBox="0 0 24 24"><path d="${dir === 'up' ? 'M6 14.5l6-6 6 6' : 'M6 9.5l6 6 6-6'}"/></svg>`;

function navButton(dir: 'up' | 'down', floor: Floor | undefined) {
  if (!floor) return `<div class="floor-nav ${dir}" aria-hidden="true"></div>`;
  const count = `<span class="count${floor.available ? '' : ' none'}">
      <svg viewBox="0 0 24 24"><use href="#i-${floor.available ? 'free' : 'busy'}"/></svg>${floor.available}</span>`;
  return `<button class="floor-nav ${dir}" data-level="${floor.level}" aria-label="${floor.name}, ${floor.available} free rooms">
      ${dir === 'up' ? chevron('up') : ''}<span class="floor-name">${floor.name}</span>${count}${dir === 'down' ? chevron('down') : ''}
    </button>`;
}

function render(state: State, direction: 'up' | 'down' | null = null) {
  const { ctx, statuses, floors, defaultFloor } = compute(state);
  const level = state.floor ?? defaultFloor;
  const idx = floors.findIndex((f) => f.level === level);
  const current = floors[idx];
  const above = floors[idx + 1];
  const below = floors[idx - 1];
  const plan = FLOOR_PLANS[level] ?? EMPTY_PLAN;

  app.innerHTML = `
    <svg width="0" height="0" class="defs" aria-hidden="true"><defs>${ICONS}</defs></svg>
    <div class="screen">
      ${navButton('up', above)}
      <main class="stage">
        <div class="floor ${direction ? `enter-${direction}` : ''}">${renderFloor(plan, statuses, ctx.location)}</div>
        <div class="current-floor">${current?.name ?? ''}</div>
      </main>
      ${navButton('down', below)}
    </div>`;

  const go = (target: Floor | undefined, dir: 'up' | 'down') => {
    if (!target) return;
    state.floor = target.level;
    render(state, dir);
  };
  app.querySelector<HTMLButtonElement>('.floor-nav.up[data-level]')?.addEventListener('click', () => go(above, 'up'));
  app.querySelector<HTMLButtonElement>('.floor-nav.down[data-level]')?.addEventListener('click', () => go(below, 'down'));
  nav.up = () => go(above, 'up');
  nav.down = () => go(below, 'down');
}

const nav = { up: () => {}, down: () => {} };

function bindGestures() {
  let startY: number | null = null;
  app.addEventListener('pointerdown', (e) => (startY = e.clientY));
  app.addEventListener('pointerup', (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;
    if (dy > 60) nav.up(); // pull down → floor above
    else if (dy < -60) nav.down(); // push up → floor below
  });
  let wheelLock = 0;
  app.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 30 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 500;
    (e.deltaY < 0 ? nav.up : nav.down)();
  }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') nav.up();
    if (e.key === 'ArrowDown') nav.down();
  });
}

async function start(course: string, events?: LectureEvent[]) {
  app.innerHTML = `<div class="loading-screen"><span class="spinner"></span></div>`;
  try {
    const [ev, rooms] = await Promise.all([events ?? fetchLectures(course), fetchRooms(now())]);
    const state: State = { course, events: ev, rooms, floor: null };
    render(state);
    bindGestures();
    setInterval(() => render(state), REFRESH_MS);
    setInterval(async () => {
      try {
        [state.events, state.rooms] = await Promise.all([fetchLectures(course), fetchRooms(now())]);
        render(state);
      } catch {
        /* keep showing the last known data */
      }
    }, REFETCH_MS);
  } catch (err) {
    if (err instanceof CourseNotFoundError) {
      clearCourse();
      return showOnboarding('Course not found');
    }
    app.innerHTML = `<div class="loading-screen"><button class="retry">Retry</button></div>`;
    app.querySelector('.retry')!.addEventListener('click', () => start(course));
  }
}

const saved = getCourse();
if (saved) start(decodeURIComponent(saved));
else showOnboarding();
