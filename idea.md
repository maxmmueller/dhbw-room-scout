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
- **Room filter:** only rooms of type `VL-Raum`, `Hörsaal` and `Gruppenarbeitsraum` are relevant. All other rooms are left off the map entirely, including their walls and outlines.
- **Lockable rooms:** some rooms can be locked and others can't. Experience shows that a lockable room is *always* locked when no booking is using it. So an unoccupied lockable room counts as **unavailable** and appears greyed out, the same as an occupied room. The API doesn't provide this information, so each room gets a manually maintained `lockable` attribute in the app's own room data.

## User Location
The user's location is taken from their timetable:
- **During a lecture:** the room of the current lecture.
- **Between lectures or after the last one:** the room of the most recently finished lecture that day.
- **Before the first lecture:** the room of the upcoming first lecture.
- **Lecture-free day:** no location. The ground floor is shown by default.

## Main Screen
- An **isometric floor plan** of the building, showing **one floor at a time**.
- **Switching floors:** arrow buttons or swipe gestures at the top and bottom edges of the screen.
- **Free-room counters:** each arrow shows how many rooms are free on the floor above or below, like the free-space display in a parking garage.
- **Default floor:** the floor of the user's current location.
- **User's room:** marked with a pin/arrow and a distinct highlight.

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
