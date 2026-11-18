# DHBW Room Scout

A mobile-first web app that shows students of DHBW Mannheim which lecture rooms on campus are free right now and recommends the best room nearby.

## User Stories

1. [Campus Overview](#1-campus-overview)
2. [Building View](#2-building-view)
3. [Floor View](#3-floor-view)
4. [Navigation](#4-navigation)
5. [Simplicity & Up-to-Date Data](#5-simplicity--up-to-date-data)
6. [Visual Design](#6-visual-design)
7. [Platform](#7-platform)
8. [Course & Onboarding](#8-course--onboarding)
9. [Availability Logic](#9-availability-logic)
10. [Campus & Room Scope](#10-campus--room-scope)
11. [Maps & Floor Plans](#11-maps--floor-plans)
12. [Recommendation](#12-recommendation)
13. [System & Data](#13-system--data)

### 1. Campus Overview

#### US01 – Campus map with free-room counts

As a student looking for a place to study,
I want to see a minimalist top-down map of the campus with the number of free rooms displayed on each building,
So that I can immediately tell which building is worth walking to without checking each one individually.

#### US02 – Mark fully occupied buildings and floors

As a student,
I want buildings and floors with zero free rooms to be visually distinguishable at a glance,
So that I don't waste time walking to a fully occupied building or floor.

### 2. Building View

#### US03 – Building side view

As a student,
I want to tap on a building and see a side view of it with the number of free rooms shown on each floor,
So that I know which floor to go to before I enter the building.

#### US04 – Floors in real order

As a student with limited time between lectures,
I want the floors to be stacked in their real order (ground floor at the bottom),
So that the view matches the physical building and I can orient myself intuitively.

### 3. Floor View

#### US05 – Floor plan with room states

As a student,
I want to tap on a floor and see a top-down floor plan where each room is marked green (free) or red (occupied),
So that I can walk directly to a free room without checking doors.

#### US06 – Room numbers on floor plan

As a lecturer looking for a room for a spontaneous meeting,
I want to see the room number on each room in the floor plan,
So that I can find the exact room I've chosen once I'm on the floor.

### 4. Navigation

#### US07 – Back navigation

As a user,
I want to go back one level (floor → building → campus) with a single tap or swipe,
So that I can quickly compare alternatives if the selected building or floor doesn't suit me.

#### US08 – Breadcrumb

As a user,
I want to always see where I am (e.g. "Campus › Building C › 2nd floor"),
So that I don't lose orientation while drilling down.

#### US09 – Highlight last lecture room

As a student who just left a lecture,
I want the room of my last lecture to be clearly highlighted on every map level (campus, building, floor),
So that I can judge which free rooms are closest to me without needing GPS.

### 5. Simplicity & Up-to-Date Data

#### US10 – Minimal interface

As a user,
I want the app to show only free/occupied information without filters, settings or extra details (the one-time course selection and the "free until" time are the only exceptions),
So that I can find a room within seconds without being overwhelmed.

#### US11 – Automatic data updates

As a user,
I want the availability data to update automatically and show when it was last updated,
So that I can trust that a room shown as free is actually free.

#### US12 – Color-blind friendly states

As a color-blind user,
I want free and occupied rooms to be distinguishable by more than just red/green (e.g. icon, pattern or text),
So that I can use the app just as reliably as everyone else.

### 6. Visual Design

#### US13 – Polished visual design

As a student using the app daily,
I want the app to have a consistent, carefully designed interface (unified colors, typography, spacing and smooth transitions between views) instead of a generic, auto-generated look,
So that I trust the room data and enjoy using the app instead of perceiving it as an unfinished side project.

### 7. Platform

#### US14 – Mobile-first PWA

As a student who checks for rooms on the way out of a lecture,
I want the app to be a mobile-first Progressive Web App that I can add to my home screen,
So that I can open it instantly on my phone without installing anything from an app store, and still use it on my laptop.

### 8. Course & Onboarding

#### US15 – One-time course entry

As a first-time user,
I want to be asked once for my course number (e.g. `TINF25IT1`) when I first open the app,
So that the app can read my lecture plan and figure out where I am and when my next lecture starts.

*Acceptance criteria:*
- The course number is validated against the lecture plan API; an unknown course shows a clear error.
- The course is saved locally on the device (cookie / localStorage); no account or login.
- On later visits the app opens directly on the campus view.

#### US16 – Change or reset course

As a user who entered the wrong course or shares a device,
I want to change or reset my saved course,
So that the recommendations and highlights are based on my actual schedule.

#### US17 – Use without a course

As a user who skips the course selection or doesn't have a course (e.g. a lecturer or guest),
I want to still use the app with plain free/occupied information,
So that the app is useful without onboarding.

*Acceptance criteria:*
- Without a course, a room counts as free if it stays free for at least 2 hours.
- There is no "last lecture" highlight and no personal recommendation; the campus view offers a hint to enter a course.

### 9. Availability Logic

#### US18 – Free-room rule

As a student,
I want a room to count as "free" only if it stays free until my next lecture starts, or for at least 2 hours if I have no more lectures today,
So that I'm never sent to a room I'll have to leave before I'm done.

*Acceptance criteria:*
- Next lecture = the next non-cancelled event of my course today (`cancelled: false`).
- Without a next lecture today: the room must stay free ≥ 2 h.
- All times from the API (UTC) are shown in local time (Europe/Berlin).

#### US19 – "Free until" time

As a student,
I want to see how long a free room stays free (e.g. "free until 14:15"),
So that I can judge whether the room is worth walking to.

#### US20 – "Soon occupied" state

As a student,
I want rooms that are free now but don't stay free long enough (by the rule above) to be shown as a separate "soon occupied" state, visually distinct from free and occupied (not by color alone),
So that I'm not sent to a room that a lecture is about to fill, but I can still see it's empty right now.

### 10. Campus & Room Scope

#### US21 – Campus buildings

As a student at the Neuostheim campus,
I want the campus map to show the A, B and C buildings (Coblitzallee) as one main block, and the D and E buildings (Hans-Thoma-Str. 52) as a secondary block next to it,
So that the map matches how the campus actually looks and I can still find rooms in the neighbouring buildings.

*Acceptance criteria:*
- Other sites (`Käfertaler Str. 258`, `Handelsstraße 13`) are not shown.
- Buildings are assigned via the `building` field of the rooms API.

#### US22 – Room types in scope

As a student looking for a place to study,
I want only lecture rooms (API type `VL-Raum`), lecture halls (`Hörsaal`) and group work rooms (`Gruppenarbeitsraum`) to be counted and recommended as free rooms,
So that I'm not sent to labs, PC rooms, meeting rooms or exam rooms that I can't or shouldn't use.

#### US23 – Highlight out-of-scope lecture rooms

As a student whose last lecture was in a room outside that list (e.g. `336B EDV-Übungsraum`),
I want that room to still be highlighted as my location on the map,
So that "closest room" still makes sense even if my lecture room isn't a candidate itself.

### 11. Maps & Floor Plans

#### US24 – Hand-drawn SVG plans

As a student,
I want the campus map and floor plans to be simplified but geometrically faithful drawings (hand-drawn SVGs) of the real buildings,
So that what I see in the app matches where rooms actually are when I walk the floor.

*Acceptance criteria:*
- Each SVG room shape is linked to the room name used by the API (e.g. `237B VL-Raum Unterrichtsraum`).
- Floors are ordered by the API's `floorLevel` (basement `UG` below ground floor `EG` below first floor `1. OG` …).
- Rooms from the API without a shape in the plan are reported in development, not silently hidden.

### 12. Recommendation

#### US25 – Recommendation card

As a student opening the app after a lecture,
I want a single recommendation card on the campus view (e.g. "Best room: 237B, free until 15:30"),
So that I get the best answer immediately without having to browse the map.

*Acceptance criteria:*
- The recommendation only appears when a course is set and the course has had a lecture today (see [US15](#us15--one-time-course-entry)).
- If no room meets the free rule, the card says so instead of recommending a "soon occupied" room.

#### US26 – Jump to recommended room

As a student,
I want tapping the recommendation card to take me straight to the floor plan with the recommended room highlighted,
So that I can walk there without navigating through the views myself.

#### US27 – Closest free room

As a student who has already attended a lecture earlier that day,
I want the top recommendation to be a free room located as close as possible to my current or last classroom,
So that I don't have to walk long distances across campus.

#### US28 – Prefer rooms with free neighbours

As a student,
I want the recommendation algorithm to prioritize rooms that have other free rooms nearby,
So that if the recommended room is unexpectedly occupied, I can easily move to an adjacent room without walking far again.

#### US29 – Exclude most recent lecture room

As a student who just finished a lecture,
I don't want the room of my own lecture to be recommended to me, even if it is free afterwards,
So that I don't end up studying where classmates are still hanging around chatting, which would be distracting.

*Acceptance criteria:*
- The room of my most recent lecture is never chosen for the recommendation card.
- Only the most recent lecture room is excluded; rooms of earlier lectures that day can still be recommended.
- The room is still shown with its normal free/occupied state on the map and keeps its "last lecture" highlight.
- The next-best room is recommended instead; the room is excluded, not just ranked lower.

### 13. System & Data

#### US30 – Fetch data from DHBW APIs

As a system (backend/frontend),
I want to retrieve current lecture schedules and room occupancy data via the public DHBW Mannheim APIs,
So that I can calculate in real time which rooms are currently available and for how long.

*Data sources:*
- Room occupancy for a whole site and day: `https://api.dhbw.dev/rapla/MA/rooms?date=YYYY-MM-DD`. Returns each room with building, floor, `floorLevel`, room type, capacity and the day's `occupancies` (start/end in UTC).
- Lecture plan of a course: `https://api.dhbw.app/rapla/lectures/MA-<COURSE>/events`. Returns events with `startTime`, `endTime`, `rooms` (same names as in the rooms API) and `cancelled`.

#### US31 – Match rooms by name

As a system,
I want to match the user's course events to rooms in the rooms API by exact room name,
So that the last-lecture room and the next lecture start time can be determined reliably.

#### US32 – Ignore cancelled lectures

As a system,
I want to ignore cancelled lectures (`cancelled: true`) when working out the user's last room and next lecture,
So that a cancelled lecture doesn't move the user's location or shorten the free time.

#### US33 – Locked rooms

As a system,
I want each room to have a `locked` attribute that can be set for specific time periods,
So that rooms that are locked at certain times (even though no lecture is scheduled) are never recommended to students.

*Acceptance criteria:*
- A room can be marked as locked for one or more time periods; outside those periods it behaves normally.
- A room that is locked at the current time is never chosen for the recommendation card ([US25](#us25--recommendation-card)).
- The rooms API doesn't provide this information, so the lock periods are maintained as separate app data.
