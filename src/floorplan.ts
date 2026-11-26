/**
 * Building geometry.
 *
 * Source images live in `floorplan/` (gitignored, kept locally).
 *
 * B/C: plan units traced from `floor2.jpeg` (≈ 1 unit = 1 px of the photo at
 * 1848 px width); floors 0, 1 and 3 from `floor<n>.jpeg`, rotated and scaled
 * to match. A, D, E: rough footprints from `campusplan.jpeg`, scaled to the
 * same units. Floor plans list every numbered room on the photos; the renderer
 * only draws usable rooms (by API room type) and the user's own room.
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
  /** Default outline / corridors, used by floors that don't override them. */
  footprint: Rect[];
  corridors: Rect[];
  /** Traced floors per API `floorLevel`. Floors missing here aren't mapped yet. */
  floors: Record<number, FloorPlan>;
  /** Street along the east side, written on the ground next to the building. */
  street?: string;
}

export interface FloorPlan {
  rooms: RoomShape[];
  footprint?: Rect[];
  corridors?: Rect[];
  /** Parts of the floor students can't enter; drawn hatched. */
  restricted?: Rect[];
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
  street: 'Coblitzallee',
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
    // floor0.jpeg and floor3.jpeg are rotated 90° clockwise relative to
    // floor2.jpeg (their top is the west wing).
    0: {
      // No west wing on the ground floor: the car park sits there.
      footprint: [
        r(175, 115, 1760, 525), // north wing
        r(70, 280, 180, 520), // NW stairs
        r(1400, 115, 1760, 1915), // east wing
        r(1760, 490, 1830, 675), // east annex (stairs / WC)
        r(1760, 1355, 1830, 1540), // east annex (stairs / WC)
        r(160, 1500, 1760, 1915), // south wing
        r(50, 1500, 165, 1750), // SW stairs
      ],
      corridors: [r(180, 280, 1605, 330), r(1555, 280, 1605, 1735), r(165, 1690, 1605, 1735)],
      rooms: [
        // north wing, outer row
        room('037B', 190, 125, 490, 275),
        room('038B', 490, 125, 784, 275),
        room('039B', 784, 125, 1079, 275),
        room('040B', 1079, 125, 1367, 275),
        room('041B', 1367, 125, 1645, 275),
        // north wing, inner row
        room('036B', 190, 335, 583, 520),
        room('035B', 583, 335, 882, 490),
        room('034B', 882, 335, 1171, 490),
        room('033B', 1171, 335, 1367, 490),
        // east wing
        room('051B', 1405, 680, 1552, 1013),
        room('050B', 1405, 1013, 1552, 1357),
        room('048B', 1605, 780, 1740, 1061),
        room('049B', 1605, 1061, 1740, 1352),
        // south wing, inner row
        room('067C', 165, 1500, 572, 1690),
        room('068C', 572, 1540, 866, 1690),
        room('069C', 866, 1540, 1160, 1690),
        room('070C', 1160, 1540, 1351, 1690),
        // south wing, outer row
        room('066C', 165, 1735, 474, 1885),
        room('065C', 474, 1735, 773, 1885),
        room('064C', 773, 1735, 1057, 1885),
        room('063C', 1057, 1735, 1351, 1885),
        room('062C', 1351, 1735, 1629, 1885),
      ],
    },
    // floor1.jpeg is rotated 90° counter-clockwise relative to floor2.jpeg
    // (its top is the east wing); traced there and mapped into these units.
    1: {
      rooms: [
      // north wing, outer row
      room('137B', 175, 125, 370, 275),
      room('137.1B', 370, 125, 670, 275),
      room('138B', 670, 125, 964, 275),
      room('139B', 964, 125, 1258, 275),
      room('140B', 1258, 125, 1555, 275),
      // north wing, inner row
      room('136.1B', 250, 335, 575, 525),
      room('136B', 575, 335, 862, 490),
      room('135B', 862, 335, 1156, 490),
      // east wing
      room('153B', 1405, 780, 1552, 1067),
      room('152B', 1405, 1067, 1552, 1358),
      room('151B', 1605, 1067, 1755, 1358),
      // west wing
      room('175C', 42, 672, 192, 975),
      room('173C', 42, 1067, 192, 1358),
      room('178C', 255, 672, 405, 1036),
      room('179C', 255, 1036, 410, 1358),
      // south wing, inner row
      room('180C', 255, 1505, 590, 1690),
      room('184C', 868, 1540, 1151, 1690),
      room('185C', 1151, 1540, 1435, 1690),
      // south wing, outer row
      room('161C', 1151, 1735, 1435, 1880),
      room('160C', 1435, 1735, 1724, 1880),
    ] },
    2: { rooms: [
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
    ] },
    3: {
      footprint: [
        r(170, 115, 1760, 525), // north wing
        r(1400, 115, 1760, 1915), // east wing
        r(1760, 495, 1900, 680), // east annex (WC)
        r(1760, 1370, 1900, 1565), // east annex (WC)
        r(150, 1480, 1760, 1915), // south wing
        r(45, 280, 260, 1735), // west corridor + stairs
        r(35, 655, 400, 1340), // west block
      ],
      // West block: staff only (crossed out on the photo).
      restricted: [r(35, 655, 400, 1340)],
      rooms: [
        // north wing, outer row
        room('337B', 195, 125, 500, 275),
        room('338B', 500, 125, 594, 275),
        room('339B', 594, 125, 884, 275),
        room('339.1B', 884, 125, 983, 275),
        room('340B', 983, 125, 1071, 275),
        room('341B', 1071, 125, 1268, 275),
        room('342B', 1268, 125, 1465, 275),
        // north wing, inner row
        room('336B', 255, 335, 583, 520),
        room('335B', 583, 335, 884, 490),
        room('334B', 884, 335, 1071, 490),
        room('333B', 1071, 335, 1356, 490),
        room('332B', 1356, 335, 1455, 490),
      ],
    },
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
