/**
 * Floor plan geometry for building B/C (Coblitzallee).
 *
 * Coordinates are plan units traced from `floor2.jpeg`
 * (≈ 1 unit = 1 px of the photo at 1848 px width; north is up).
 * Only rooms the app cares about are drawn — offices, labs, toilets
 * etc. are intentionally left out.
 */

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RoomShape extends Rect {
  /** Room number as used at the start of the API room name, e.g. "238B". */
  id: string;
}

export interface FloorPlan {
  footprint: Rect[];
  corridors: Rect[];
  rooms: RoomShape[];
}

const r = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
const room = (id: string, x0: number, y0: number, x1: number, y1: number): RoomShape => ({
  id,
  ...r(x0, y0, x1, y1),
});

/** Outer shape of the building ring (same on every upper floor). */
const FOOTPRINT: Rect[] = [
  r(170, 115, 1735, 520), // north wing
  r(1400, 280, 1760, 1700), // east wing
  r(1600, 465, 1830, 660), // east annex (stairs / WC)
  r(1600, 1340, 1830, 1525), // east annex (stairs / WC)
  r(200, 1500, 1740, 1915), // south wing
  r(60, 290, 410, 1735), // west wing
  r(40, 672, 210, 1360), // west bulge
];

const CORRIDORS: Rect[] = [
  r(178, 280, 1600, 330),
  r(1555, 280, 1605, 1735),
  r(200, 1690, 1605, 1735),
  r(190, 280, 255, 1735),
];

export const FLOOR_PLANS: Record<number, FloorPlan> = {
  2: {
    footprint: FOOTPRINT,
    corridors: CORRIDORS,
    rooms: [
      // north wing, outer row
      room('238B', 178, 125, 422, 275),
      room('239B', 422, 125, 665, 275),
      room('240B', 665, 125, 910, 275),
      room('242B', 1005, 125, 1248, 275),
      room('243B', 1248, 125, 1538, 275),
      // north wing, inner row
      room('237B', 235, 335, 575, 518),
      // east wing
      room('258B', 1405, 662, 1552, 955),
      room('256B', 1405, 1050, 1552, 1345),
      room('255B', 1605, 1050, 1755, 1340),
      // west wing
      room('273C', 42, 672, 192, 968),
      room('271C', 42, 1065, 210, 1360),
      room('276C', 255, 668, 405, 1030),
      room('277C', 255, 1030, 410, 1350),
      // south wing
      room('278C', 255, 1508, 590, 1690),
      room('279C', 590, 1540, 880, 1690),
      room('269C', 205, 1735, 595, 1905),
      room('268C', 595, 1735, 880, 1905),
    ],
  },
};

/** Used for floors that haven't been traced yet: the shell without rooms. */
export const EMPTY_PLAN: FloorPlan = { footprint: FOOTPRINT, corridors: CORRIDORS, rooms: [] };
