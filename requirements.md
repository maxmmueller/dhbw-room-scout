# DHBW Room Scout – User Stories

A minimal, mobile-first web app that shows DHBW Mannheim students which rooms are free right after their lecture, on an isometric floor plan of the building they are in.

Related: [`idea.md`](idea.md) (product concept) · [`README.md`](README.md) (developer docs)

## Contents

1. [Onboarding](#1-onboarding)
2. [Floor Plan](#2-floor-plan)
3. [Navigation](#3-navigation)
4. [User Location](#4-user-location)
5. [Availability Logic](#5-availability-logic)
6. [Design & Accessibility](#6-design--accessibility)
7. [System & Data](#7-system--data)
8. [Out of Scope](#8-out-of-scope)

## Glossary

| Term | Meaning |
|---|---|
| **Usable room** | A room with API type `VL-Raum`, `Hörsaal` or `Gruppenarbeitsraum` |
| **Building unit** | One entry in the building switch: **B/C** (connected ring), **A**, **D**, **E** |
| **Own room** | The room of the user's current, last or upcoming lecture today (see [US12](#us12--determine-the-users-location)) |
| **Next lecture** | The user's next non-cancelled lecture today that starts after now |
| **Available** | A room that is green or yellow (see [US15](#us15--traffic-light-before-the-next-lecture)) |

---

### 1. Onboarding

#### US01 – One-time course entry

As a first-time user,
I want to be asked once for my course ID in a single text field,
So that the app can load my timetable and work out where I am.

*Acceptance criteria:*
- The onboarding screen shows only the app logo (see [US29](#us29--app-logo)) and the text field (with a submit control inside it); there are no other controls or texts.
- The placeholder shows an example (`e.g. TINF25IT1`) so the expected format is clear.
- Input is case-insensitive; a leading `MA-` is accepted and stripped.
- The course ID is stored in a cookie; on later visits the app opens directly on the floor plan.

#### US03 – Validate the course

As a user who mistyped their course,
I want to be told immediately that the course doesn't exist,
So that I don't end up with an empty or wrong map.

*Acceptance criteria:*
- While typing, up to 6 matching course IDs are suggested below the text field, loaded once from `https://api.dhbw.app/courses/MA/mapped/extended` (see [US25](#us25--fetch-data-from-the-dhbw-apis)).
  - Matching is case-insensitive and ignores a leading `MA-`; courses whose ID starts with the input come first, then courses that contain it.
  - Each suggestion shows the course ID (without `MA-`) and, smaller, its degree name.
  - A suggestion can be picked by tap/click or with ↑ / ↓ and Enter; picking one validates and submits it immediately. Escape closes the list.
  - Hidden or invisible courses and malformed IDs (e.g. `MA---TCT26`) are not suggested.
  - If the course list can't be loaded, the field works as before, just without suggestions.
- The course is checked against the timetable API before it is saved; an unknown course (HTTP 404) shows a short error ("Course not found") and nothing is stored.
- A network error shows a separate short message and lets the user try again.
- If a stored course later turns out to be unknown, it is cleared and the onboarding screen is shown.

---

### 2. Floor Plan

#### US04 – Isometric floor plan

As a student,
I want to see an isometric plan of one floor of a building,
So that I can see at a glance where the free rooms are and walk straight to one.

*Acceptance criteria:*
- Exactly one floor of one building unit is visible at a time.
- The plan is a simplified, geometrically faithful drawing based on the real floor plans (photos in `floorplan/`, e.g. `floorplan/floor2.jpeg`; kept locally, not in the repository).
- The map is the only content of the main screen and fills the available space.

#### US05 – Only usable rooms are drawn

As a student,
I want only rooms I can actually use to appear on the map,
So that offices, labs, toilets and other irrelevant rooms don't clutter the view.

*Acceptance criteria:*
- Only usable rooms (`VL-Raum`, `Hörsaal`, `Gruppenarbeitsraum`) are drawn; walls and outlines of other rooms are not drawn at all.
- Exception: the user's own room is always drawn (see [US13](#us13--highlight-own-room)).
- The building shell and corridors can be drawn as neutral context for orientation.

#### US06 – Room numbers on the map

As a student,
I want each drawn room to show its room number (e.g. `238B`),
So that I can find the room once I'm on the floor.

---

### 3. Navigation

#### US07 – Switch floors

As a student,
I want to switch floors with a vertical swipe or by tapping the floor indicator,
So that I can check the floors above and below me without buttons covering the map.

*Acceptance criteria:*
- Swiping down shows the floor above, swiping up the floor below; on desktop the mouse wheel and the ↑ / ↓ keys work too.
- The floor indicator is a column of small pills in the top-right corner, below the menu button: one pill per floor, the lowest floor at the bottom. The current floor's pill is stretched and dark.
- Tapping a pill jumps directly to that floor.
- The floor change is animated in the direction of travel.
- Swiping past the top or bottom floor gives a short "bounce" of the map instead of doing nothing.

#### US08 – Skip floors with nothing for me

As a student,
I want a swipe to skip floors where nothing is free and my lecture isn't,
So that I get to a useful floor with as few swipes as possible.

*Acceptance criteria:*
- A floor is useful if at least one room on it is available (green or yellow) or it holds the own room.
- Swiping up / down goes to the next useful floor in that direction; if there is none, the map bounces (see [US07](#us07--switch-floors)).
- Tapping a pill always goes to that floor, useful or not.

#### US09 – Switch buildings

As a student,
I want to switch between building units with a horizontal swipe or by tapping the building indicator,
So that I can look for free rooms in the neighbouring building.

*Acceptance criteria:*
- The units are ordered as on the campus map: **B/C → A → D → E**. The switch does not wrap around; swiping past either end bounces.
- The building indicator is a row of small pills centered at the bottom, one per unit; the current unit's pill is stretched and dark. Tapping a pill jumps to that unit.
- Swiping right shows the unit on the left, swiping left the one on the right; on desktop the ← / → keys work too.
- After switching, the same floor level is shown if the new unit has it, otherwise the closest existing level.
- Changing the floor doesn't redraw or re-animate the building indicator, and vice versa.

#### US10 – Indicators that stay out of the way

As a student,
I want the floor and building indicators to appear only when I navigate,
So that the map can use the whole screen but I still know where I am.

*Acceptance criteria:*
- At rest the indicators are invisible and can't be tapped by accident; any touch, swipe, scroll or key press shows them, and they fade out about 1.5 s after the last interaction.
- After a change, the new floor name (e.g. `2. OG`) or building (e.g. `B/C`) pops up next to its pill for about a second.
- When the app opens, both indicators and both names are shown for a moment, so users learn that they exist.
- The current building and floor are announced to screen readers (e.g. `B/C · 2. OG`), and the pills are reachable by keyboard (they become visible when focused).

#### US11 – Default view

As a student opening the app,
I want it to open on the building and floor I'm most likely interested in,
So that I don't have to navigate first.

*Acceptance criteria:*
- If an own room is known: open on the building unit and floor of that room.
- Otherwise (lecture-free day, no lecture today): open on the last building/floor viewed on this device.
- If nothing was viewed yet: open on **B/C, ground floor (EG)**.

#### US30 – Menu for less frequent actions

As a student,
I want a small menu that holds actions I don't need all the time,
So that I can, for example, switch to another course without clearing my cookies, while the map stays uncluttered.

*Acceptance criteria:*
- A single, unobtrusive menu button (⋯) sits in the top-right corner of the main screen; the menu opens as a small popover from it.
- The menu shows the current course ID and these actions:
  - **Change course:** opens the course input (with autocomplete, see [US03](#us03--validate-the-course)). The new course is validated before it replaces the old one; *Cancel* (or Escape) returns to the map with the old course unchanged.
  - **Go to my room:** jumps to the building unit and floor of the own room. Only shown if an own room is known.
  - **Refresh:** fetches the timetable and room data again right away.
- The menu closes on picking an action, tapping outside it, or pressing Escape. While it is open, swipes and arrow keys don't change the floor or building.
- It is fully usable with keyboard and screen reader (menu button with `aria-expanded`, items as menu items, focus moves into the menu and back).

---

### 4. User Location

#### US12 – Determine the user's location

As a student,
I want the app to work out where I am from my timetable,
So that I don't need GPS or any manual input.

*Acceptance criteria:*
- Own room = room of the **current** lecture; otherwise the **most recently finished** lecture today; otherwise (before the first lecture) the **first upcoming** lecture today.
- Only lectures on the current day count. On a lecture-free day there is no own room.
- If a lecture has several rooms, the first one is used.

#### US13 – Highlight own room

As a student,
I want my own room to be clearly highlighted,
So that I can judge which free rooms are close to me.

*Acceptance criteria:*
- The own room is drawn in **blue**, regardless of its availability.
- Its status icon is still shown, so the user can see whether the room itself is free.
- The own room is drawn even if it isn't a usable room type (e.g. `336B EDV-Übungsraum`); its geometry must therefore be part of the floor plan.

#### US14 – Ignore cancelled lectures

As a student,
I want cancelled lectures (`cancelled: true`) to be ignored,
So that a cancelled lecture doesn't move my location or shorten my free time.

---

### 5. Availability Logic

#### US15 – Traffic light before the next lecture

As a student who has another lecture later today,
I want rooms to be colored by whether they stay free until my next lecture,
So that I'm not sent to a room I'll have to leave before my lecture starts.

*Acceptance criteria (applies before the first lecture and between lectures):*
- **Green:** free now and not booked before the next lecture starts.
- **Yellow/orange:** free now, but booked before the next lecture starts.
- **Grey:** unavailable (see [US17](#us17--unavailable-rooms)).

#### US16 – Traffic light after the last lecture and on lecture-free days

As a student with no more lectures today,
I want rooms to be colored by whether they stay free for at least one hour,
So that I only go to rooms where I can study for a while.

*Acceptance criteria (applies during or after the last lecture of the day, and on lecture-free days):*
- **Green:** free now for at least 1 hour.
- **Yellow/orange:** free now, but for less than 1 hour.
- **Grey:** unavailable.

#### US17 – Unavailable rooms

As a student,
I want unavailable rooms to be greyed out instead of shown in a signal color,
So that the screen isn't crowded with colors and the free rooms stand out.

*Acceptance criteria:*
- A room is unavailable if it is booked right now, or if it is lockable (see [US18](#us18--lockable-rooms)).
- Unavailable rooms are grey and visually recede (e.g. drawn flat), while available rooms stand out.

#### US18 – Lockable rooms

As a student,
I don't want rooms that are locked when not in use to be shown as free,
So that I don't walk to a room I can't get into.

*Acceptance criteria:*
- Each room has a manually maintained `lockable` attribute (the API doesn't provide this).
- From experience, a lockable room is always locked when not in use, so an unoccupied lockable room counts as unavailable.
- Locked rooms have their own icon (lock), distinct from occupied rooms.

#### US19 – Up-to-date data

As a student,
I want the map to stay current while the app is open,
So that I can trust that a room shown as free really is free.

*Acceptance criteria:*
- The colors are recalculated every minute; the API data is refetched every few minutes.
- If a refetch fails, the last known data stays on screen.
- No "last updated" text is shown.
- All API times (UTC) are evaluated in local time (Europe/Berlin).

---

### 6. Design & Accessibility

#### US20 – Color-blind friendly states

As a color-blind user,
I want every room state to be shown by an icon as well as its color,
So that I can use the app as reliably as everyone else.

*Acceptance criteria:*
- Every state always has an icon: free (✓), soon occupied (clock), occupied (–), locked (lock).

#### US21 – Minimal interface

As a student in a hurry,
I want the app to show nothing but the color-coded map,
So that I can find a room within seconds without distractions.

*Acceptance criteria:*
- No lists, filters, settings, legends, info texts, times (e.g. no "free until") or recommendations.
- The only UI elements besides the map are the menu button (see [US30](#us30--menu-for-less-frequent-actions)) and the floor and building indicators, which are only visible while navigating (see [US10](#us10--indicators-that-stay-out-of-the-way)).

#### US22 – Single color scheme

As a user,
I want one consistent color scheme,
So that the app always looks the same.

*Acceptance criteria:*
- There is no light/dark mode switch, and the app does not follow the system theme.

#### US23 – Polished, production-ready look

As a student using the app daily,
I want a carefully designed interface (consistent colors, typography, spacing and smooth transitions) that doesn't look auto-generated,
So that I trust the data and enjoy using the app.

#### US24 – Mobile-first and responsive

As a student checking for rooms on the way out of a lecture,
I want the app to work well on my phone,
So that I can use it on the go, and still use it on my laptop.

*Acceptance criteria:*
- The layout is designed for phones first and scales to laptop screens.
- Touch gestures (swipe) on mobile; mouse wheel, arrow keys and clicking the indicators on desktop.
- The app is a plain web app (no PWA / install).
- The UI language is English.

#### US28 – Usable with the on-screen keyboard open

As a student entering my course on my phone,
I want every part of the onboarding screen to stay visible and reachable while the on-screen keyboard is open,
So that I can see what I type, the suggestions and any error message without closing the keyboard.

*Acceptance criteria:*
- When the keyboard opens, the text field moves up so that it, its submit button, the error message and at least the first course suggestions sit in the visible area above the keyboard.
- Nothing is hidden behind the keyboard or the browser's toolbars, and the page doesn't need to be scrolled to reach any element.
- Works in Safari on iOS and Chrome on Android, in portrait and landscape.
- When the keyboard closes, the layout returns to its normal, centered state without jumping.

#### US29 – App logo

As a student,
I want the app to have its own recognisable logo,
So that I can find it quickly among my browser tabs and bookmarks and it feels like a real product.

*Acceptance criteria:*
- The logo is a symbol (two nested isometric diamonds) with the wordmark **ROOM**SCOUT; source files are in `logo/`.
- In the app it uses the app's ink color with red as the accent (red: inner diamond and "ROOM").
- The wordmark is converted to outlines (from the free font Nunito Sans), so the logo looks the same on every device and no web font is loaded for it.
- **Start page:** symbol and wordmark stacked, centered above the course field.
- **Main page:** symbol and wordmark side by side at the top of the menu (see [US30](#us30--menu-for-less-frequent-actions)); the map screen itself shows no logo.
- The symbol is the favicon (`public/favicon.svg`) with slightly thicker lines, so it still reads in a browser tab; in a dark browser UI its outer lines turn light. iOS home-screen bookmarks (and Safari) use `public/apple-touch-icon.png` (180 × 180 px, app background).

---

### 7. System & Data

#### US25 – Fetch data from the DHBW APIs

As a system,
I want to load the course timetable and the day's room bookings from the public DHBW APIs,
So that availability can be calculated.

*Data sources:*
- Timetable: `https://api.dhbw.app/rapla/lectures/MA-<COURSE>/events`. Returns events with `startTime`, `endTime`, `rooms` and `cancelled`.
- Room occupancy: `https://api.dhbw.dev/rapla/MA/rooms?date=YYYY-MM-DD`. Returns every room with building, `floor`, `floorLevel`, type (`displayName`) and the day's `occupancies` (UTC).
- Course list (for autocomplete): `https://api.dhbw.app/courses/MA/mapped/extended`. Returns all courses grouped by faculty and degree, each with `name` (e.g. `MA-TINF25IT1`), `degreeName`, `visible` and `hidden`.

*Acceptance criteria:*
- None of the APIs send CORS headers, so requests go through a proxy.

#### US26 – Match rooms by room number

As a system,
I want to match timetable rooms, API rooms and floor-plan shapes by room number,
So that the own room and room states line up correctly on the map.

*Acceptance criteria:*
- The room number is the first token of the API room name (`"238B VL-Raum Unterrichtsraum"` → `238B`).
- Rooms from the API without a shape on the plan are reported during development, not silently ignored.

#### US27 – Campus scope

As a student at the Coblitzallee campus,
I want the app to cover only the buildings A–E,
So that I'm not shown rooms at other sites.

*Acceptance criteria:*
- Building units: B/C and A (Coblitzallee 1-9), D and E (Hans-Thoma-Str. 52).
- Other sites (`Käfertaler Str. 258`, `Handelsstraße 13`) are excluded.
- Rooms are assigned to buildings via the API's `building` field and to floors via `floorLevel`.

---

### 8. Out of Scope

These were part of earlier drafts and are deliberately **not** planned for now:

- Campus overview map and building side view (replaced by the building/floor indicators)
- Free-room counts per floor and the arrow buttons that showed them (replaced by the indicators, see [US10](#us10--indicators-that-stay-out-of-the-way))
- A permanent position label (replaced by the pop-up names next to the indicators)
- Breadcrumb navigation
- Recommendation card / "best room" logic
- "Free until" times and "last updated" indicator
- Using the app without a course
- PWA / installable app
- Opening hours of the buildings
- Other DHBW Mannheim sites
- Dark mode
