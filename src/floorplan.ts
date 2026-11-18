/**
 * Building geometry.
 *
 * B/C: plan units traced from `floor2.jpeg` (≈ 1 unit = 1 px of the photo at
 * 1848 px width). A, D, E: rough footprints from `campusplan.jpeg`, scaled
 * to the same units. Floor plans list every traced room; the renderer only
 * draws usable rooms and the user's own room.
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

export interface BuildingUnit {
  /** Label shown in the UI, e.g. "B/C". */
  label: string;
  /** Building letters from the API (`building.name` starts with "<X>-Gebäude"). */
  letters: string[];
  footprint: Rect[];
  corridors: Rect[];
  /** Traced rooms per API `floorLevel`. Floors missing here aren't mapped yet. */
  floors: Record<number, RoomShape[]>;
}

const r = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
const room = (id: string, x0: number, y0: number, x1: number, y1: number): RoomShape => ({
  id,
  ...r(x0, y0, x1, y1),
});

/** Converts campusplan.jpeg pixels to plan units, relative to a building's corner. */
const CAMPUS_SCALE = 3.5;
const campus = (ox: number, oy: number) => (x0: number, y0: number, x1: number, y1: number) =>
  r((x0 - ox) * CAMPUS_SCALE, (y0 - oy) * CAMPUS_SCALE, (x1 - ox) * CAMPUS_SCALE, (y1 - oy) * CAMPUS_SCALE);

// ── B/C ring ───────────────────────────────────────────────────────────
const BC: BuildingUnit = {
  label: 'B/C',
  letters: ['B', 'C'],
  footprint: [
    r(170, 115, 1735, 520), // north wing
    r(1400, 280, 1760, 1700), // east wing
    r(1600, 465, 1830, 660), // east annex (stairs / WC)
    r(1600, 1340, 1830, 1525), // east annex (stairs / WC)
    r(200, 1500, 1740, 1915), // south wing
    r(60, 290, 410, 1735), // west wing
    r(40, 672, 210, 1360), // west bulge
  ],
  corridors: [
    r(178, 280, 1600, 330),
    r(1555, 280, 1605, 1735),
    r(200, 1690, 1605, 1735),
    r(190, 280, 255, 1735),
  ],
  floors: {
    2: [
      // north wing, outer row
      room('238B', 178, 125, 422, 275),
      room('239B', 422, 125, 665, 275),
      room('240B', 665, 125, 910, 275),
      room('241B', 910, 125, 1005, 275),
      room('242B', 1005, 125, 1248, 275),
      room('243B', 1248, 125, 1538, 275),
      room('244B', 1538, 125, 1630, 275),
      room('245B', 1630, 125, 1730, 275),
      // north wing, inner row
      room('237B', 235, 335, 575, 518),
      room('236B', 575, 335, 862, 490),
      room('235B', 862, 335, 960, 490),
      room('234B', 960, 335, 1248, 490),
      room('233B', 1248, 335, 1345, 490),
      room('232B', 1345, 335, 1445, 490),
      // east wing
      room('246B', 1605, 280, 1730, 370),
      room('247B', 1605, 370, 1730, 465),
      room('258B', 1405, 662, 1552, 955),
      room('257B', 1405, 955, 1552, 1050),
      room('256B', 1405, 1050, 1552, 1345),
      room('251B', 1605, 662, 1755, 760),
      room('252B', 1605, 760, 1755, 855),
      room('253B', 1605, 855, 1755, 955),
      room('254B', 1605, 955, 1755, 1050),
      room('255B', 1605, 1050, 1755, 1340),
      // west wing
      room('273C', 42, 672, 192, 968),
      room('272C', 42, 968, 192, 1065),
      room('271C', 42, 1065, 210, 1360),
      room('276C', 255, 668, 405, 1030),
      room('277C', 255, 1030, 410, 1350),
      // south wing, inner row
      room('278C', 255, 1508, 590, 1690),
      room('279C', 590, 1540, 880, 1690),
      room('280C', 880, 1540, 1165, 1690),
      room('281C', 1165, 1540, 1450, 1690),
      // south wing, outer row
      room('269C', 205, 1735, 595, 1905),
      room('268C', 595, 1735, 880, 1905),
      room('267C', 880, 1735, 975, 1810),
      room('266C', 975, 1735, 1072, 1880),
      room('265C', 1072, 1735, 1165, 1880),
      room('264C', 1165, 1735, 1262, 1880),
      room('263C', 1262, 1735, 1360, 1880),
      room('262C', 1360, 1735, 1450, 1880),
      room('261C', 1450, 1735, 1640, 1880),
    ],
  },
};

// ── A (L-shape) ────────────────────────────────────────────────────────
const a = campus(920, 745);
const A: BuildingUnit = {
  label: 'A',
  letters: ['A'],
  footprint: [a(920, 1015, 1313, 1160), a(1213, 745, 1313, 1015)],
  corridors: [],
  floors: {},
};

// ── D (ring) ───────────────────────────────────────────────────────────
const d = campus(1516, 700);
const D: BuildingUnit = {
  label: 'D',
  letters: ['D'],
  footprint: [
    d(1516, 700, 1948, 808),
    d(1516, 1093, 1948, 1157),
    d(1516, 808, 1646, 1093),
    d(1817, 808, 1948, 1093),
  ],
  corridors: [],
  floors: {},
};

// ── E (block) ──────────────────────────────────────────────────────────
const e = campus(1516, 264);
const E: BuildingUnit = {
  label: 'E',
  letters: ['E'],
  footprint: [e(1516, 264, 1948, 464)],
  corridors: [],
  floors: {},
};

/** Order of the building switch (left → right, as on the campus map). */
export const BUILDINGS: BuildingUnit[] = [BC, A, D, E];
