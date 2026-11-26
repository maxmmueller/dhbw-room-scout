# Room Scout – Product Concept

## Overview
Room Scout is a web app that helps university students find an available room right after a lecture ends, so they can put the time to use (studying, group work, etc.) instead of wandering the campus looking for one.

## Onboarding
- On first launch, the user enters their course ID in a single text field. A placeholder (e.g. `TINF25IT1`) shows the expected format.
- The ID is stored in a cookie, so the user only enters it once.
- The onboarding screen has no other controls.
- Entering the ID is mandatory: the app is not usable without it. This works like delivery apps such as Lieferando, which ask for a postcode or location before showing anything.

## Data Sources
| Purpose | Endpoint |
|---|---|
| Course timetable | `https://api.dhbw.app/rapla/lectures/MA-{courseId}/events` (e.g. `MA-TINF25IT1`) |
| Room occupancy (all campus rooms) | `https://api.dhbw.dev/rapla/MA/rooms?date={YYYY-MM-DD}` (e.g. `2026-11-18`) |

- **Timetable:** JSON list of the course's lectures with start time, end time and room number. Every student in a course has the same schedule.
- **Room occupancy:** the booked time slots of every room on campus for the given date.
- **Room filter:** only rooms of type `VL-Raum`, `Hörsaal` and `Gruppenarbeitsraum` are relevant. All other rooms are left off the map entirely, including their walls and outlines. The one exception is the user's own lecture room (see below).
- **Campus scope:** only buildings A–E (Coblitzallee 1-9 and Hans-Thoma-Str. 52). Other DHBW Mannheim sites (Käfertaler Str. 258, Handelsstraße 13) are excluded.
- **Lockable rooms:** some rooms can be locked and others can't. Experience shows that a lockable room is *always* locked when no booking is using it. So an unoccupied lockable room counts as **unavailable** and appears greyed out, the same as an occupied room. The API doesn't provide this information, so each room gets a manually maintained `lockable` attribute in the app's own room data.

## User Location
The user's location is taken from their timetable:
- **During a lecture:** the room of the current lecture.
- **Between lectures or after the last one:** the room of the most recently finished lecture that day.
- **Before the first lecture:** the room of the upcoming first lecture.
- **Lecture-free day:** no location.
- Cancelled lectures are ignored.

## Main Screen
- An **isometric floor plan**, showing **one floor of one building at a time**.
- **Switching floors:** vertical swipes, or tapping a dot of the floor indicator (a column of small dots in the top-right corner, like the photo dots of an Instagram post). Swipes skip floors where nothing is free.
- **Switching buildings:** horizontal swipes, or tapping a dot of the building indicator (a row of dots at the bottom). The buildings follow the campus map (`floorplan/campusplan.jpeg`) in the order **B/C → A → D → E**, where B and C form one connected ring. After switching, the app shows the same floor level if the new building has it, otherwise the closest one.
- **Indicators only while navigating:** both indicators are invisible at rest and appear while the user touches, swipes or scrolls. The current dot is dark; the building and floor are always named in a small title in the top-left corner. Swiping past the last floor or building makes the map bounce. When the app opens, the indicators show briefly so users learn they exist.
- **Default view:** the building and floor of the user's own room. Without one, the last viewed building and floor on this device. If nothing has been viewed yet, the ground floor (EG) of B/C.
- **User's room:** always drawn **blue**, whatever its status, and even if it isn't a usable room type (e.g. an EDV room). Its status icon is still shown.

## Availability Coding (traffic-light system)
| Context | Green | Yellow/Orange | Grey |
|---|---|---|---|
| Another lecture follows today (before the first lecture or between lectures) | Free until the next lecture starts | Free now, but booked before the next lecture | Occupied or locked |
| During or after the last lecture of the day | Free for ≥ 1 h | Free for < 1 h | Occupied or locked |
| Lecture-free day | Free for ≥ 1 h | Free for < 1 h | Occupied or locked |

- Unavailable rooms (occupied, or lockable and not in use) are greyed out, so the screen isn't crowded with signal colors.
- Only rooms marked green or yellow make a floor worth swiping to.
- **Accessibility:** every state is **always** shown with an icon as well as its color, so the app works for color-blind users.

## Design Principles
- **Radical minimalism:** the color-coded floor plan is the whole interface. There are no lists, filters, info texts, legends or other distractions.
- **One fixed color scheme:** no light/dark mode toggle.
- **Production quality:** professional and polished, with no "vibe-coded" look.
- **Mobile-first and responsive:** designed for phones, but fully usable on laptops.
- **Plain web app** (no PWA), with an English UI.

## Not Planned (for now)
- Recommendation card, "free until" times and a "last updated" indicator
- Changing the course in the UI (only by clearing cookies)
- Building opening hours
