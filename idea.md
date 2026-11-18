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
- **Switching floors:** arrow buttons or vertical swipes at the top and bottom edges of the screen.
- **Free-room counters:** each floor arrow shows the floor's name and how many rooms are free there, like the free-space display in a parking garage.
- **Switching buildings:** arrow buttons or horizontal swipes at the left and right edges. The buildings follow the campus map (`campusplan.jpeg`) in the order **B/C → A → D → E**, where B and C form one connected ring. The building arrows only show the neighbouring building's letter, with no count. After switching, the app shows the same floor level if the new building has it, otherwise the closest one.
- **Position label:** a small, unobtrusive label shows the current building and floor (e.g. `B/C · 2. OG`).
- **Default view:** the building and floor of the user's own room. Without one, the last viewed building and floor on this device. If nothing has been viewed yet, the ground floor (EG) of B/C.
- **User's room:** always drawn **blue** with a **pin**, whatever its status, and even if it isn't a usable room type (e.g. an EDV room). Its status icon is still shown.

## Availability Coding (traffic-light system)
| Context | Green | Yellow/Orange | Grey |
|---|---|---|---|
| Another lecture follows today (before the first lecture or between lectures) | Free until the next lecture starts | Free now, but booked before the next lecture | Occupied or locked |
| During or after the last lecture of the day | Free for ≥ 1 h | Free for < 1 h | Occupied or locked |
| Lecture-free day | Free for ≥ 1 h | Free for < 1 h | Occupied or locked |

- Unavailable rooms (occupied, or lockable and not in use) are greyed out, so the screen isn't crowded with signal colors.
- Only rooms marked green or yellow count toward the free-room numbers on the floor arrows.
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
