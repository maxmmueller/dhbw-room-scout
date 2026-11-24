# DHBW Room Scout

A minimal, mobile-first web app that shows DHBW Mannheim students which lecture rooms around them are free right now, on an isometric floor plan.

- Product concept: [`idea.md`](idea.md)
- User stories: [`requirements.md`](requirements.md)

> **Status:** proof of concept. Only building B/C is mapped in detail (floors 0–3). Buildings A, D and E show only a rough outline traced from the campus map, but their floors and room states come from the real data.

## Getting started

Requirements: Node.js 20+.

```sh
npm install
npm run dev
```

Open http://localhost:5173, enter a course ID (e.g. `TINF25IT1`) and press Enter.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run dev -- --host` | Same, also reachable from your phone (same Wi-Fi), via the printed "Network" URL |
| `npm run build` | Type-check (`tsc`) and build into `dist/` |
| `npm run preview` | Serve the production build locally |

Opening `dist/index.html` directly does **not** work, because the API calls need the proxy (see below).

### Testing tips

- **Simulate a time:** add `?now=<ISO datetime>` to the URL, e.g. `http://localhost:5173/?now=2026-11-18T15:00` (local time). This is meant for demos and testing and is not linked from the UI.
- **Change the course:** delete the `course` cookie (DevTools → Application → Cookies) and reload.
- **Reset the default view:** delete `lastView` from Local Storage.
- **Switch floors:** swipe vertically, scroll the mouse wheel, press ↑ / ↓, or tap a pill of the floor indicator (top right).
- **Switch buildings:** swipe horizontally, press ← / →, or tap a pill of the building indicator (bottom center).
- The indicators are invisible at rest and appear as soon as you touch, swipe or scroll.

## Tech stack

- [Vite](https://vitejs.dev/) + TypeScript (strict), no UI framework
- The floor plan is rendered as an SVG string with a hand-written isometric projection
- Plain CSS with tokens in `:root` (one fixed color scheme, no dark mode)
- Font: Inter via Google Fonts

## Project structure

```
index.html            App shell
vite.config.ts        Dev/preview proxy for the DHBW APIs
src/
  main.ts             Onboarding, cookie, main screen, floor/building navigation, default view, refresh loop
  api.ts              API types and fetch functions
  availability.ts     Room filter, user location, status rules, lockable rooms
  floorplan.ts        Building units (B/C, A, D, E): footprint, corridors, traced rooms per floor
  render.ts           Isometric SVG renderer and status icons
  style.css           All styles and color tokens
floorplan/            Source images (gitignored, local only, see below)
  floor0–3.jpeg       Photos of the B/C floor plans the rooms are traced from
  campusplan.jpeg     Campus map (building positions, order and the A/D/E outlines)
```

The source images in `floorplan/` are not in the repository. They're only needed to trace or correct room geometry in `src/floorplan.ts`, not to build or run the app.

## Data sources

| Purpose | Upstream URL | Local path (proxied) |
|---|---|---|
| Course timetable | `https://api.dhbw.app/rapla/lectures/MA-{COURSE}/events` | `/api/lectures/MA-{COURSE}/events` |
| Room occupancy for one day | `https://api.dhbw.dev/rapla/MA/rooms?date=YYYY-MM-DD` | `/api/rooms?date=YYYY-MM-DD` |
| Course list (autocomplete) | `https://api.dhbw.app/courses/MA/mapped/extended` | `/api/courses` |

- **No CORS headers:** none of the APIs send them, so the browser can't call them directly. `vite.config.ts` proxies `/api/*` for both `dev` and `preview`. A production deployment needs an equivalent reverse proxy (e.g. nginx, a Netlify/Vercel rewrite, or a small edge function).
- **Times are in UTC:** API times are UTC ISO strings and are compared as `Date` objects. "Today" means the browser's local date.
- **Unknown course:** the timetable endpoint returns `404`, which the app shows as "Course not found".
- **Room IDs:** rooms are matched by the first token of the API room name, e.g. `"238B VL-Raum Unterrichtsraum"` → `238B`. Timetable events use the same names.
- **Refresh:** the colors are recomputed every 60 s, and the data is fetched again every 5 min.

## Domain rules

All rules live in `src/availability.ts`.

**Relevant rooms:** `details.displayName` starts with `VL-Raum`, `Hörsaal` or `Gruppenarbeitsraum`. Other rooms are neither drawn nor counted. The one exception is the user's own room, which is always drawn.

**Buildings:** a room's building comes from `building.name` (`"B-Gebäude, …"` → `B`). The building switch runs **B/C → A → D → E**. Other sites (Käfertaler Str., Handelsstraße) are ignored. A building's floor list comes from all of its rooms in the API, so a floor can exist with 0 usable rooms.

**User location:** taken from today's non-cancelled lectures, in this order of priority:
1. the current lecture
2. the last finished lecture
3. the first upcoming lecture

If a lecture lists several rooms, the first one is used.

**Default view:**
1. the building and floor of the user's own room
2. otherwise the last viewed building and floor (`localStorage`, key `lastView`)
3. otherwise B/C, ground floor (EG)

After switching buildings, the same floor level is kept if it exists, otherwise the closest one.

**Room status:**

| Status | Color + icon | Rule |
|---|---|---|
| `free` | green, ✓ | Free now and stays free until the target time (or has no further bookings) |
| `soon` | amber, clock | Free now, but booked before the target time |
| `busy` | grey, – | Booked right now |
| `locked` | grey, lock | Free, but in `LOCKABLE_ROOMS` (such rooms are always locked when not in use) |

The **target time** is the start of the user's next lecture today, or *now + 1 h* if there is none (after the last lecture, or on a lecture-free day).

The user's own lecture room is always drawn **blue** with a pin above it. Its status icon still shows whether it's free.

A floor counts as worth swiping to if it has at least one `free` or `soon` room, or holds the user's own room.

**Lockable rooms:** the API doesn't provide this, so maintain the list by hand in `LOCKABLE_ROOMS` in `src/availability.ts`.

## Adding a floor plan

1. Take a photo or scan of the floor plan.
2. In `src/floorplan.ts`, find the building unit in `BUILDINGS` and add an entry to its `floors`, keyed by the API's `floorLevel` (`0` = EG, `1` = 1. OG, …).
3. Trace **every lecture-type room** as a rectangle `room('ID', x0, y0, x1, y1)`, including labs and EDV rooms. Coordinates are pixels of the source image, and the ID must match the API room number. Non-usable rooms are only drawn when they're the user's own room, so they need geometry too.
4. Replace the rough `footprint` (and add `corridors`) for A, D and E once you have real plans. All floors of a building share its footprint.

The renderer computes the viewBox automatically and draws only usable rooms plus the user's own room. A floor without an entry in `floors` shows "Plan not mapped yet".

## Design principles

The UI stays deliberately minimal: no lists, filters, legends or info texts. Every status is shown by color **and** icon, so color-blind users can tell them apart. See [`idea.md`](idea.md) for the full concept.
