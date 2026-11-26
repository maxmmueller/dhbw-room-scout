# DHBW Room Scout – Core User Stories

**Problem:** After a lecture, students at DHBW Mannheim want to find a free room to study in, but they don't know which rooms are free, or for how long.

**Solution:** A minimal, mobile-first web app. Enter your course once (or skip it), and it shows an isometric floor plan of the building you're in, with every room colored by whether you can use it right now: **green** = free, **yellow** = free, but not for long, **grey** = taken or locked.

This document lists only the **core** user stories, the ones the app can't work without. The complete list, with refinements and design details, is in [`requirements.md`](requirements.md). The story IDs are the same in both files and on our kanban board.

---

## Overview

| ID | As a student, I want … | Area | Status |
|---|---|---|---|
| [US01](#us01--optional-course-entry) | to enter my course once, or skip it | Onboarding | Done |
| [US03](#us03--validate-the-course) | to know right away if I mistyped my course | Onboarding | Done |
| [US04](#us04--isometric-floor-plan) | to see a floor plan of the building | Floor plan | In progress (B/C done; A, D, E open) |
| [US05](#us05--only-usable-rooms-are-drawn) | to see only rooms I can actually use | Floor plan | Done |
| [US06](#us06--room-numbers-on-the-map) | to see the room numbers | Floor plan | Done |
| [US07](#us07--switch-floors) | to switch floors | Navigation | Done |
| [US09](#us09--switch-buildings) | to switch buildings | Navigation | Done |
| [US12](#us12--determine-the-users-location) | the app to know where I am, without GPS | Location | Done |
| [US13](#us13--highlight-own-room) | my own room to be highlighted | Location | Done |
| [US15](#us15--traffic-light-before-the-next-lecture) | rooms colored by whether they stay free until my next lecture | Availability | Done |
| [US16](#us16--traffic-light-after-the-last-lecture) | rooms colored by whether they stay free for at least an hour | Availability | Done |
| [US17](#us17--unavailable-rooms) | taken and locked rooms to step back | Availability | Done |
| [US19](#us19--up-to-date-data) | the map to stay up to date | Availability | Done |
| [US24](#us24--mobile-first-and-responsive) | to use it on my phone | Design | Done |
| [US25](#us25--fetch-data-from-the-dhbw-apis) | real data from the DHBW systems | System | In progress (works locally; hosting open) |

---

## 1. Onboarding

#### US01 – Optional course entry

> As a **first-time user**,
> I want to **enter my course ID once, or skip it**,
> so that **the app can load my timetable, but also works without one**.

**Acceptance criteria:**
- The start screen has just one text field (with an example such as `TINF25IT1`).
- The course is remembered on the device; later visits open the map directly.
- A × button closes the page: the app then works without a course (no own room, rooms count as free if they stay free for an hour).

#### US03 – Validate the course

> As a **user who mistyped their course**,
> I want to **be told right away**,
> so that **I don't end up with an empty or wrong map**.

**Acceptance criteria:**
- Matching courses are suggested while typing (from the official DHBW course list).
- An unknown course shows "Course not found" and nothing is saved.
- A connection problem shows its own message and lets me try again.

---

## 2. Floor Plan

#### US04 – Isometric floor plan

> As a **student**,
> I want to **see an isometric plan of one floor of a building**,
> so that **I can see at a glance where the free rooms are and walk straight there**.

**Acceptance criteria:**
- Exactly one floor of one building is shown at a time, and the map fills the screen.
- The plan is simplified but true to scale, traced from the real floor plans.

#### US05 – Only usable rooms are drawn

> As a **student**,
> I want to **see only rooms I can actually use**,
> so that **offices, labs and toilets don't clutter the map**.

**Acceptance criteria:**
- Only lecture rooms, lecture halls and group rooms are drawn.
- Exception: my own lecture room is always drawn (see [US13](#us13--highlight-own-room)).

#### US06 – Room numbers on the map

> As a **student**,
> I want to **see each room's number** (e.g. `238B`),
> so that **I can find the room once I'm on the floor**.

---

## 3. Navigation

#### US07 – Switch floors

> As a **student**,
> I want to **switch floors with a vertical swipe**,
> so that **I can check the floors above and below me**.

**Acceptance criteria:**
- Swiping down shows the floor above, swiping up the floor below (mouse wheel and arrow keys on a laptop).
- A small indicator shows which floor I'm on, and the change is animated.

#### US09 – Switch buildings

> As a **student**,
> I want to **switch buildings with a horizontal swipe**,
> so that **I can look for free rooms in the building next door**.

**Acceptance criteria:**
- The buildings follow the campus map: **B/C → A → D → E**.
- After switching, I stay on the same floor if the new building has it.

---

## 4. User Location

#### US12 – Determine the user's location

> As a **student**,
> I want the **app to work out where I am from my timetable**,
> so that **I don't need GPS or any extra input**.

**Acceptance criteria:**
- My room is the room of my **current** lecture; otherwise my **last** lecture today; otherwise my **next** one.
- The app opens on that building and floor; without one, on B/C, 1st floor.

#### US13 – Highlight own room

> As a **student**,
> I want **my own room to be clearly highlighted**,
> so that **I can see which free rooms are close to me**.

**Acceptance criteria:**
- My room is drawn in **blue**, and I can still see whether it's free.

---

## 5. Availability

#### US15 – Traffic light before the next lecture

> As a **student with another lecture later today**,
> I want **rooms colored by whether they stay free until that lecture**,
> so that **I'm not sent to a room I'll have to leave too early**.

**Acceptance criteria:**
- 🟢 **Green:** free now and until my next lecture starts.
- 🟡 **Yellow:** free now, but booked before my next lecture.
- ⚪ **Grey:** not available (see [US17](#us17--unavailable-rooms)).

#### US16 – Traffic light after the last lecture

> As a **student with no more lectures today**,
> I want **rooms colored by whether they stay free for at least an hour**,
> so that **I only go to rooms where I can study for a while**.

**Acceptance criteria:**
- 🟢 **Green:** free for at least one hour.
- 🟡 **Yellow:** free, but for less than an hour.

#### US17 – Unavailable rooms

> As a **student**,
> I want **rooms I can't use to be greyed out**,
> so that **the free rooms stand out**.

**Acceptance criteria:**
- Rooms that are booked right now, or locked when not in use, are grey and drawn flat.
- Every state also has an icon (✓, clock, –, lock), so color isn't the only signal.

#### US19 – Up-to-date data

> As a **student**,
> I want **the map to stay current while the app is open**,
> so that **a room shown as free really is free**.

**Acceptance criteria:**
- Colors are updated every minute, and the data is reloaded every few minutes.
- If loading fails, the last known state stays on screen.

---

## 6. Platform & Data

#### US24 – Mobile-first and responsive

> As a **student on my way out of a lecture**,
> I want **the app to work well on my phone**,
> so that **I can use it on the go, and on my laptop too**.

**Acceptance criteria:**
- The layout is designed for phones first and scales up to laptops.
- It's a plain web app: nothing to install.

#### US25 – Fetch data from the DHBW APIs

> As **the system**,
> I want to **load the timetable and the day's room bookings from the public DHBW APIs**,
> so that **availability is based on real data**.

**Acceptance criteria:**
- Timetables come from the DHBW timetable API, room bookings from the DHBW room API.
- Both work in the browser, through a small proxy, because the APIs block direct browser access.

---

## Glossary

| Term | Meaning |
|---|---|
| **Usable room** | A lecture room, lecture hall or group room |
| **Building unit** | One step of the building switch: **B/C** (one connected ring), **A**, **D**, **E** |
| **Own room** | The room of my current, last or next lecture today |

## Out of Scope

Not part of the core stories (see [`requirements.md`](requirements.md) for the full list):

- Lists, filters, recommendations, "free until" times
- A campus overview map
- Other DHBW Mannheim sites
- Installing as an app, dark mode
- Design details, logo, menu and refinements (e.g. skipping empty floors)
