import './style.css';
import { CourseNotFoundError, fetchLectures, fetchRooms, type ApiRoom, type LectureEvent } from './api';
import { buildingLetter, dayContext, isAvailable, isRelevant, roomId, roomStatus, type Status } from './availability';
import { BUILDINGS } from './floorplan';
import { ICONS, renderFloor } from './render';

const app = document.getElementById('app')!;
const COOKIE = 'course';
const LAST_VIEW_KEY = 'lastView';
const REFRESH_MS = 60_000;
const REFETCH_MS = 5 * 60_000;

// ── persistence ───────────────────────────────────────────────────────
const getCourse = () => document.cookie.match(/(?:^|; )course=([^;]+)/)?.[1] ?? null;
const setCourse = (c: string) =>
  (document.cookie = `${COOKIE}=${encodeURIComponent(c)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`);
const clearCourse = () => (document.cookie = `${COOKIE}=; max-age=0; path=/`);

interface View {
  unit: number;
  level: number;
}

function loadLastView(): View | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_VIEW_KEY) ?? 'null') as { unit: string; level: number } | null;
    const unit = BUILDINGS.findIndex((b) => b.label === raw?.unit);
    return raw && unit >= 0 ? { unit, level: raw.level } : null;
  } catch {
    return null;
  }
}

function saveLastView(v: View) {
  try {
    localStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ unit: BUILDINGS[v.unit].label, level: v.level }));
  } catch {
    /* storage unavailable – not critical */
  }
}

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
  /** null until the default view has been resolved on first render. */
  view: View | null;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function compute(state: State) {
  const t = now();
  const ctx = dayContext(state.events, t);
  /** Rooms to draw: all usable rooms plus the user's own room. */
  const statuses = new Map<string, Status>();
  const floors: Map<number, Floor>[] = BUILDINGS.map(() => new Map());
  let own: View | null = null;

  for (const room of state.rooms) {
    const letter = buildingLetter(room);
    const unit = BUILDINGS.findIndex((b) => letter !== null && b.letters.includes(letter));
    const level = room.details.floorLevel;
    if (unit < 0 || level === null) continue;

    const floor = floors[unit].get(level) ?? { level, name: room.details.floor ?? `${level}`, available: 0 };
    floors[unit].set(level, floor);

    const id = roomId(room.name);
    const isOwn = id === ctx.location;
    if (isOwn) own = { unit, level };
    if (!isRelevant(room) && !isOwn) continue;

    const s = roomStatus(room, t, ctx.freeUntilTarget);
    statuses.set(id, s);
    if (isRelevant(room) && isAvailable(s)) floor.available++;
  }

  return {
    location: ctx.location,
    statuses,
    floors: floors.map((m) => [...m.values()].sort((a, b) => a.level - b.level)),
    own: own as View | null,
  };
}

/** Same level if the unit has it, otherwise the closest existing one. */
function closestLevel(floors: Floor[], level: number): number {
  if (floors.length === 0) return level;
  return floors.reduce((best, f) => (Math.abs(f.level - level) < Math.abs(best - level) ? f.level : best), floors[0].level);
}

const CHEVRONS: Record<Direction, string> = {
  up: 'M6 14.5l6-6 6 6',
  down: 'M6 9.5l6 6 6-6',
  left: 'M14.5 6l-6 6 6 6',
  right: 'M9.5 6l6 6-6 6',
};
const chevron = (dir: Direction) => `<svg class="chev" viewBox="0 0 24 24"><path d="${CHEVRONS[dir]}"/></svg>`;

function floorButton(dir: 'up' | 'down', floor: Floor | undefined) {
  if (!floor) return `<div class="floor-nav ${dir}" aria-hidden="true"></div>`;
  const count = `<span class="count${floor.available ? '' : ' none'}">
      <svg viewBox="0 0 24 24"><use href="#i-${floor.available ? 'free' : 'busy'}"/></svg>${floor.available}</span>`;
  return `<button class="floor-nav ${dir}" aria-label="${floor.name}, ${floor.available} free rooms">
      ${dir === 'up' ? chevron('up') : ''}<span class="floor-name">${floor.name}</span>${count}${dir === 'down' ? chevron('down') : ''}
    </button>`;
}

function buildingButton(dir: 'left' | 'right', unit: number) {
  const b = BUILDINGS[unit];
  if (!b) return `<div class="bldg-nav ${dir}" aria-hidden="true"></div>`;
  return `<button class="bldg-nav ${dir}" aria-label="Building ${b.label}">${chevron(dir)}<span>${b.label}</span></button>`;
}

const nav: Record<Direction, () => void> = { up() {}, down() {}, left() {}, right() {} };

function render(state: State, direction: Direction | null = null) {
  const { location, statuses, floors, own } = compute(state);

  if (!state.view) {
    state.view = own ?? loadLastView() ?? { unit: 0, level: 0 };
    state.view.level = closestLevel(floors[state.view.unit], state.view.level);
  }
  const { unit, level } = state.view;
  const unitFloors = floors[unit];
  const idx = unitFloors.findIndex((f) => f.level === level);
  const current = unitFloors[idx];
  const above = idx >= 0 ? unitFloors[idx + 1] : undefined;
  const below = idx >= 0 ? unitFloors[idx - 1] : undefined;
  const b = BUILDINGS[unit];
  const f = b.floors[level];
  const plan = {
    footprint: f?.footprint ?? b.footprint,
    corridors: f?.corridors ?? b.corridors,
    restricted: f?.restricted ?? [],
    rooms: f?.rooms ?? null,
  };

  app.innerHTML = `
    <svg width="0" height="0" class="defs" aria-hidden="true"><defs>${ICONS}</defs></svg>
    <div class="screen">
      ${floorButton('up', above)}
      ${buildingButton('left', unit - 1)}
      <main class="stage">
        <div class="floor ${direction ? `enter-${direction}` : ''}">${renderFloor(plan, statuses, location)}</div>
        <div class="position">${b.label} · ${current?.name ?? ''}</div>
      </main>
      ${buildingButton('right', unit + 1)}
      ${floorButton('down', below)}
    </div>`;

  const go = (next: View, dir: Direction) => {
    state.view = next;
    saveLastView(next);
    render(state, dir);
  };
  const toUnit = (u: number, dir: Direction) =>
    BUILDINGS[u] && go({ unit: u, level: closestLevel(floors[u], level) }, dir);

  nav.up = () => above && go({ unit, level: above.level }, 'up');
  nav.down = () => below && go({ unit, level: below.level }, 'down');
  nav.left = () => toUnit(unit - 1, 'left');
  nav.right = () => toUnit(unit + 1, 'right');

  app.querySelector('button.floor-nav.up')?.addEventListener('click', nav.up);
  app.querySelector('button.floor-nav.down')?.addEventListener('click', nav.down);
  app.querySelector('button.bldg-nav.left')?.addEventListener('click', nav.left);
  app.querySelector('button.bldg-nav.right')?.addEventListener('click', nav.right);
}

function bindGestures() {
  let start: { x: number; y: number } | null = null;
  app.addEventListener('pointerdown', (e) => (start = { x: e.clientX, y: e.clientY }));
  app.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
    if (Math.abs(dy) >= Math.abs(dx)) (dy > 0 ? nav.up : nav.down)(); // pull down → floor above
    else (dx > 0 ? nav.left : nav.right)(); // pull right → building on the left
  });
  let wheelLock = 0;
  app.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) < 30 || Date.now() < wheelLock) return;
      wheelLock = Date.now() + 500;
      (e.deltaY < 0 ? nav.up : nav.down)();
    },
    { passive: true },
  );
  window.addEventListener('keydown', (e) => {
    const key: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (key[e.key]) nav[key[e.key]]();
  });
}

async function start(course: string, events?: LectureEvent[]) {
  app.innerHTML = `<div class="loading-screen"><span class="spinner"></span></div>`;
  try {
    const [ev, rooms] = await Promise.all([events ?? fetchLectures(course), fetchRooms(now())]);
    const state: State = { course, events: ev, rooms, view: null };
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
