// Inter, served with the app (no requests to Google Fonts).
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './style.css';
import {
  CourseNotFoundError,
  fetchCourses,
  fetchLectures,
  fetchRooms,
  type ApiRoom,
  type Course,
  type LectureEvent,
} from './api';
import { BUILDINGS } from './floorplan';
import { LOGO_HORIZONTAL, LOGO_STACKED } from './logo';
import { closestLevel, compute, floorTitle, isUseful, normalizeCourse, suggest, type View } from './model';
import { renderFloor } from './render';

const app = document.getElementById('app')!;
const COOKIE = 'course';
const LAST_VIEW_KEY = 'lastView';
/** Set once the course page was submitted or closed: later visits open the map directly. */
const WELCOMED_KEY = 'welcomed';
/** Where the app opens without an own room and without a last view: B/C, 1st floor. */
const DEFAULT_VIEW: View = { unit: 0, level: 1 };
const REFRESH_MS = 60_000;
const REFETCH_MS = 5 * 60_000;

// ── persistence ───────────────────────────────────────────────────────
function getCourse(): string | null {
  const raw = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    return normalizeCourse(decodeURIComponent(raw)) || null;
  } catch {
    return null; // malformed cookie: treat as not set
  }
}
const setCourse = (c: string) =>
  (document.cookie = `${COOKIE}=${encodeURIComponent(c)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`);
const clearCourse = () => (document.cookie = `${COOKIE}=; max-age=0; path=/`);

function loadLastView(): View | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_VIEW_KEY) ?? 'null') as { unit: string; level: number } | null;
    const unit = BUILDINGS.findIndex((b) => b.label === raw?.unit);
    return raw && unit >= 0 ? { unit, level: raw.level } : null;
  } catch {
    return null;
  }
}

const isWelcomed = () => {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1';
  } catch {
    return false;
  }
};
const setWelcomed = () => {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    /* storage unavailable: the course page just shows again next time */
  }
};

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
const MAX_SUGGESTIONS = 6;

/** Loaded once; on failure the field simply works without suggestions. */
let courses: Promise<Course[]> | null = null;
const loadCourses = () => (courses ??= fetchCourses().catch(() => []));

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * The course page: first visit and "Add / Change course" from the menu.
 * The course is optional – the × button goes (back) to the map without
 * changing it. `back` is the map state to return to, if there is one.
 */
function showCoursePage({ error = '', value = '', back = active }: { error?: string; value?: string; back?: State | null } = {}) {
  session?.stop();
  app.innerHTML = `
    <form class="onboarding" novalidate>
      <button type="button" class="corner-btn close-btn" aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>
      </button>
      <h1 class="start-logo">${LOGO_STACKED}</h1>
      <div class="combo">
        <div class="field${error ? ' invalid' : ''}">
          <input name="course" autocomplete="off" autocapitalize="characters" spellcheck="false"
            placeholder="e.g. TINF25IT1" aria-label="Course ID" aria-invalid="${!!error}"
            role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestions" />
          <button type="submit" aria-label="Continue">
            <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5"/></svg>
          </button>
        </div>
        <ul class="suggestions" id="suggestions" role="listbox" aria-label="Matching courses" hidden></ul>
      </div>
      <p class="error" role="alert">${error}</p>
    </form>`;
  const form = app.querySelector('form')!;
  const input = form.querySelector('input')!;
  const list = form.querySelector<HTMLUListElement>('.suggestions')!;
  input.value = value;
  input.focus();

  const leave = () => {
    setWelcomed();
    if (back) run(back);
    else void start(getCourse());
  };

  let matches: Course[] = [];
  let active = -1;

  const render = () => {
    list.hidden = matches.length === 0;
    list.innerHTML = matches
      .map(
        (c, i) => `
        <li role="option" id="suggestion-${i}" data-index="${i}" aria-selected="${i === active}">
          <span class="id">${escapeHtml(c.id)}</span><span class="degree">${escapeHtml(c.degree)}</span>
        </li>`,
      )
      .join('');
    // Show only as many suggestions as fit below the field (max-height in CSS):
    // drop the lowest-ranked ones instead of making the list scroll.
    while (matches.length && list.scrollHeight > list.clientHeight) {
      list.lastElementChild!.remove();
      matches.pop();
    }
    if (active >= matches.length) active = -1;
    const open = matches.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (active >= 0) input.setAttribute('aria-activedescendant', `suggestion-${active}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const close = () => {
    matches = [];
    active = -1;
    render();
  };

  const update = async () => {
    const query = input.value;
    const all = await loadCourses();
    if (input.value !== query || document.activeElement !== input) return; // stale
    const next = suggest(all, query, MAX_SUGGESTIONS);
    // Hide the list once the input already is exactly the only match.
    matches = next.length === 1 && next[0].id === normalizeCourse(query) ? [] : next;
    active = -1;
    render();
  };

  const submit = async (raw: string) => {
    const course = normalizeCourse(raw);
    if (!course) return;
    close();
    input.value = course;
    form.classList.add('loading');
    try {
      const events = await fetchLectures(course);
      setCourse(course);
      setWelcomed();
      void start(course, events);
    } catch (err) {
      showCoursePage({
        error: err instanceof CourseNotFoundError ? 'Course not found' : 'Connection problem – try again',
        value: course,
        back,
      });
    }
  };

  input.addEventListener('input', () => {
    form.querySelector('.field')!.classList.remove('invalid');
    void update();
  });
  input.addEventListener('focus', () => void update());
  // The space below the field changes with the window / on-screen keyboard.
  const onResize = () => {
    if (!input.isConnected) return window.removeEventListener('resize', onResize);
    if (document.activeElement === input) void update();
  };
  window.addEventListener('resize', onResize);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (e) => {
    if (!matches.length) {
      if (e.key === 'Escape') leave();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + matches.length + 1) % (matches.length + 1);
      if (active === matches.length) active = -1; // wrap through "nothing selected"
      render();
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      void submit(matches[active].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  // pointerdown + preventDefault keeps focus in the input (no blur → no close).
  list.addEventListener('pointerdown', (e) => {
    const li = (e.target as Element).closest<HTMLLIElement>('li[data-index]');
    if (!li) return;
    e.preventDefault();
    void submit(matches[Number(li.dataset.index)].id);
  });
  form.querySelector('.close-btn')!.addEventListener('click', leave);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit(input.value);
  });

  void loadCourses();
}

// ── main screen ───────────────────────────────────────────────────────
interface State {
  /** null: used without a course (no own room, rooms count as free for an hour). */
  course: string | null;
  events: LectureEvent[];
  rooms: ApiRoom[];
  /** null until the default view has been resolved on first render. */
  view: View | null;
  menuOpen: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/** Current navigation targets; replaced on every render. */
const nav = {
  up() {},
  down() {},
  left() {},
  right() {},
  /** Tap on a floor pill (index from the lowest floor). */
  floor(_i: number) {},
  /** Tap on a building pill. */
  unit(_i: number) {},
};
const noop = () => {};

const MENU_ICONS = {
  dots: '<circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/>',
  course: '<path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5M20 16H7M10.5 12.5 7 16l3.5 3.5"/>',
  add: '<path d="M12 5.5v13M5.5 12h13"/>',
  remove: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  own: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
};
const menuIcon = (name: keyof typeof MENU_ICONS) => `<svg viewBox="0 0 24 24" aria-hidden="true">${MENU_ICONS[name]}</svg>`;

function menu(state: State, hasOwn: boolean) {
  const button = `
    <button class="corner-btn menu-btn" aria-label="Menu" aria-haspopup="menu"
      aria-expanded="${state.menuOpen}" aria-controls="menu">${menuIcon('dots')}</button>`;
  if (!state.menuOpen) return button;
  const item = (action: string, icon: keyof typeof MENU_ICONS, label: string) =>
    `<button role="menuitem" data-action="${action}">${menuIcon(icon)}${label}</button>`;
  return `${button}
    <div class="menu-backdrop"></div>
    <div class="menu" id="menu" role="menu" aria-label="Menu">
      <div class="menu-logo" role="presentation">${LOGO_HORIZONTAL}</div>
      ${state.course ? `<div class="menu-course" role="presentation"><span>Course</span><strong>${escapeHtml(state.course)}</strong></div>` : ''}
      ${state.course ? item('course', 'course', 'Change course') : item('course', 'add', 'Add course')}
      ${hasOwn ? item('own', 'own', 'Go to my room') : ''}
      ${state.course ? item('remove', 'remove', 'Remove course') : ''}
    </div>`;
}

/**
 * Builds the main screen once per session. Afterwards `render` only updates
 * the map, the pills and the menu, so e.g. the building pills don't replay
 * their animation when the floor changes (and the minute refresh doesn't
 * flash anything).
 */
function mountScreen() {
  app.innerHTML = `
    <div class="screen">
      <main class="stage"><div class="floor"></div></main>
      <header class="place" aria-hidden="true"><span class="place-unit"></span><span class="place-floor"></span></header>
      <nav class="pills floors" aria-label="Floors"></nav>
      <nav class="pills units" aria-label="Buildings"></nav>
      <p class="sr-only" aria-live="polite"></p>
      <div class="menu-layer"></div>
    </div>`;
  const screen = app.querySelector<HTMLElement>('.screen')!;
  screen.addEventListener('click', (e) => {
    const pill = (e.target as Element).closest<HTMLElement>('.pill');
    if (!pill) return;
    if (pill.dataset.floor !== undefined) nav.floor(Number(pill.dataset.floor));
    else nav.unit(Number(pill.dataset.unit));
  });
}

interface PillState {
  label: string;
  active: boolean;
}

/**
 * Updates a row of indicator dots in place: dots are added/removed only at
 * the end and classes change only where the state changed.
 */
function syncPills(row: HTMLElement, attr: 'floor' | 'unit', pills: PillState[]) {
  while (row.children.length > pills.length) row.lastElementChild!.remove();
  while (row.children.length < pills.length) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.dataset[attr] = String(row.children.length);
    row.append(b);
  }
  pills.forEach((p, i) => {
    const b = row.children[i] as HTMLElement;
    b.setAttribute('aria-label', p.label);
    b.toggleAttribute('aria-current', p.active);
    b.classList.toggle('on', p.active);
  });
}

// ── indicator visibility ──────────────────────────────────────────────
const AWAKE_MS = 1600;
let awakeTimer = 0;

/** Shows the indicator dots on any interaction; they fade out after a moment without. */
function wake(ms = AWAKE_MS) {
  const screen = app.querySelector('.screen');
  if (!screen) return;
  screen.classList.add('awake');
  clearTimeout(awakeTimer);
  awakeTimer = window.setTimeout(() => screen.classList.remove('awake'), ms);
}

/** On app start: show the dots for a moment, so people learn they exist. */
function intro() {
  wake(2600);
}

const NUDGE: Record<Direction, [number, number]> = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };

/** Rubber-band nudge when there's nothing further in that direction. */
function bounce(dir: Direction) {
  wake();
  const [x, y] = NUDGE[dir];
  app.querySelector('.floor')?.animate(
    [{ transform: 'translate(0, 0)' }, { transform: `translate(${x * 16}px, ${y * 16}px)` }, { transform: 'translate(0, 0)' }],
    { duration: 320, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
  );
}

// ── render ────────────────────────────────────────────────────────────
/**
 * Updates the main screen for `state`. `direction` animates the map in;
 * `changed` (floor / building) briefly shows the indicators.
 */
function render(state: State, direction: Direction | null = null, changed: 'floor' | 'unit' | 'both' | null = null) {
  const { location, statuses, floors, own } = compute(state.rooms, state.events, now());

  if (!state.view) {
    state.view = own ?? loadLastView() ?? { ...DEFAULT_VIEW };
    state.view.level = closestLevel(floors[state.view.unit], state.view.level);
  }
  const { unit, level } = state.view;
  const unitFloors = floors[unit];
  const idx = unitFloors.findIndex((f) => f.level === level);
  const current = unitFloors[idx];
  // Swiping skips floors with nothing for you (tapping a pill doesn't).
  const above = idx >= 0 ? unitFloors.slice(idx + 1).find(isUseful) : undefined;
  const below = idx >= 0 ? unitFloors.slice(0, idx).reverse().find(isUseful) : undefined;
  const b = BUILDINGS[unit];
  const f = b.floors[level];
  const plan = {
    footprint: f?.footprint ?? b.footprint,
    corridors: f?.corridors ?? b.corridors,
    restricted: f?.restricted ?? [],
    rooms: f?.rooms ?? null,
  };

  const floorEl = app.querySelector<HTMLElement>('.floor')!;
  floorEl.innerHTML = renderFloor(plan, statuses, location, b.street);
  floorEl.className = 'floor';
  if (direction) {
    void floorEl.offsetWidth; // restart the enter animation
    floorEl.classList.add(`enter-${direction}`);
  }

  syncPills(
    app.querySelector<HTMLElement>('.pills.floors')!,
    'floor',
    unitFloors.map((fl) => ({ label: fl.name, active: fl.level === level })),
  );
  syncPills(
    app.querySelector<HTMLElement>('.pills.units')!,
    'unit',
    BUILDINGS.map((bu, i) => ({ label: `Building ${bu.label}`, active: i === unit })),
  );
  const position = `${b.label} · ${current?.name ?? ''}`;
  app.querySelector('.place-unit')!.textContent = `Building ${b.label}`;
  app.querySelector('.place-floor')!.textContent = floorTitle(level);
  const live = app.querySelector('.sr-only')!;
  if (live.textContent !== position) live.textContent = position;

  app.querySelector('.menu-layer')!.innerHTML = menu(state, own !== null);
  bindMenu(state, own);

  if (changed) wake();

  const go = (next: View, dir: Direction, what: 'floor' | 'unit') => {
    state.view = next;
    saveLastView(next);
    render(state, dir, what);
  };
  const toFloor = (i: number) => {
    const target = unitFloors[i];
    if (target && target.level !== level) go({ unit, level: target.level }, target.level > level ? 'up' : 'down', 'floor');
  };
  const toUnit = (u: number) => {
    if (u === unit) return;
    const dir: Direction = u < unit ? 'left' : 'right';
    if (!BUILDINGS[u]) return bounce(dir);
    go({ unit: u, level: closestLevel(floors[u], level) }, dir, 'unit');
  };

  if (state.menuOpen) {
    // The menu is modal: no floor/building changes behind it.
    Object.assign(nav, { up: noop, down: noop, left: noop, right: noop, floor: noop, unit: noop });
    return;
  }
  nav.up = () => (above ? go({ unit, level: above.level }, 'up', 'floor') : bounce('up'));
  nav.down = () => (below ? go({ unit, level: below.level }, 'down', 'floor') : bounce('down'));
  nav.left = () => toUnit(unit - 1);
  nav.right = () => toUnit(unit + 1);
  nav.floor = toFloor;
  nav.unit = toUnit;
}

function bindMenu(state: State, own: View | null) {
  const button = app.querySelector<HTMLButtonElement>('.menu-btn')!;
  const setOpen = (open: boolean, focusButton = true) => {
    state.menuOpen = open;
    render(state);
    if (open) app.querySelector<HTMLElement>('.menu [role="menuitem"]')?.focus();
    else if (focusButton) app.querySelector<HTMLElement>('.menu-btn')?.focus();
  };
  button.addEventListener('click', () => setOpen(!state.menuOpen));
  if (!state.menuOpen) return;

  const menuEl = app.querySelector<HTMLElement>('.menu')!;
  const items = [...menuEl.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  app.querySelector('.menu-backdrop')!.addEventListener('click', () => setOpen(false, false));
  menuEl.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    }
  });

  const actions: Record<string, () => void> = {
    course: () => {
      state.menuOpen = false;
      showCoursePage({ value: state.course ?? '' });
    },
    remove: () => {
      clearCourse();
      state.course = null;
      state.events = [];
      setOpen(false);
    },
    own: () => {
      const prev = state.view;
      if (own) {
        state.view = own;
        saveLastView(own);
      }
      setOpen(false);
      if (own && (prev?.unit !== own.unit || prev?.level !== own.level)) wake();
    },
  };
  for (const el of items) el.addEventListener('click', () => actions[el.dataset.action!]());
}

function bindGestures(signal: AbortSignal) {
  let start: { x: number; y: number } | null = null;
  app.addEventListener(
    'pointerdown',
    (e) => {
      // Taps on pills and the menu aren't swipes and don't wake the pills.
      if ((e.target as Element).closest('.pill, .menu-layer')) return;
      start = { x: e.clientX, y: e.clientY };
      wake();
    },
    { signal },
  );
  app.addEventListener('pointercancel', () => (start = null), { signal });
  app.addEventListener(
    'pointerup',
    (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
      if (Math.abs(dy) >= Math.abs(dx)) (dy > 0 ? nav.up : nav.down)(); // pull down → floor above
      else (dx > 0 ? nav.left : nav.right)(); // pull right → building on the left
    },
    { signal },
  );
  let wheelLock = 0;
  app.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) < 30 || Date.now() < wheelLock) return;
      wake();
      wheelLock = Date.now() + 500;
      (e.deltaY < 0 ? nav.up : nav.down)();
    },
    { passive: true, signal },
  );
  window.addEventListener(
    'keydown',
    (e) => {
      const key: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (key[e.key]) nav[key[e.key]]();
    },
    { signal },
  );
}

// ── lifecycle ─────────────────────────────────────────────────────────
/** The state shown on the main screen; null while onboarding/loading. */
let active: State | null = null;
/** Stops the timers and input listeners of the main screen. */
let session: { stop(): void } | null = null;

async function refetch(state: State) {
  try {
    const course = state.course;
    const [events, rooms] = await Promise.all([course ? fetchLectures(course) : [], fetchRooms(now())]);
    // The course may have been changed/removed meanwhile: only apply matching data.
    if (state.course !== course) return;
    state.events = events;
    state.rooms = rooms;
  } catch {
    /* keep showing the last known data */
  }
}

/** Shows the main screen for `state` and keeps it up to date. */
function run(state: State, { showIntro = false } = {}) {
  session?.stop();
  mountScreen();
  const ac = new AbortController();
  bindGestures(ac.signal);
  // While the menu is open, skip re-renders (they would close it); closing re-renders.
  const update = () => active === state && !state.menuOpen && render(state);
  const tick = setInterval(update, REFRESH_MS);
  const fetchTimer = setInterval(() => void refetch(state).then(update), REFETCH_MS);
  // Timers are throttled in background tabs: catch up when the app is shown again.
  let hiddenAt = 0;
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) return void (hiddenAt = Date.now());
      update();
      if (Date.now() - hiddenAt > REFRESH_MS) void refetch(state).then(update);
    },
    { signal: ac.signal },
  );
  active = state;
  session = {
    stop() {
      clearInterval(tick);
      clearInterval(fetchTimer);
      ac.abort();
      active = null;
      session = null;
    },
  };
  render(state);
  if (showIntro) intro();
}

/** Loads everything for `course` (or none) and shows the map. */
async function start(course: string | null, events?: LectureEvent[]) {
  session?.stop();
  app.innerHTML = `<div class="loading-screen"><span class="spinner"></span></div>`;
  try {
    const [ev, rooms] = await Promise.all([events ?? (course ? fetchLectures(course) : []), fetchRooms(now())]);
    run({ course, events: ev, rooms, view: null, menuOpen: false }, { showIntro: true });
  } catch (err) {
    if (err instanceof CourseNotFoundError) {
      clearCourse();
      return showCoursePage({ error: 'Course not found', back: null });
    }
    app.innerHTML = `<div class="loading-screen"><button class="retry">Retry</button></div>`;
    app.querySelector('.retry')!.addEventListener('click', () => void start(course));
  }
}

const saved = getCourse();
if (saved || isWelcomed()) void start(saved);
else showCoursePage();
