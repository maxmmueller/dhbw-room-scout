import type { Status } from './availability';
import type { Rect, RoomShape } from './floorplan';

export interface FloorView {
  footprint: Rect[];
  corridors: Rect[];
  /** Areas students can't enter, drawn hatched. */
  restricted: Rect[];
  /** Traced rooms of this floor, or null if the floor isn't mapped yet. */
  rooms: RoomShape[] | null;
}

// Projection: rotate the plan 45° and tilt it, giving an isometric look.
const COS = Math.SQRT1_2;
const TILT = 0.58;
const SLAB = 26; // slab thickness
const ROOM_HIGH = 44; // available rooms stand out
const ROOM_LOW = 10; // unavailable rooms recede
const INSET = 7; // gap between neighbouring rooms

type Pt = [number, number];

const HATCH =
  '<pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
  '<rect class="hatch-bg" width="16" height="16"/><line class="hatch" x1="0" y1="0" x2="0" y2="16"/></pattern>';

export const ICONS = `
<symbol id="i-free" viewBox="0 0 24 24"><path d="M6.5 12.5l3.8 3.8L17.5 8.5"/></symbol>
<symbol id="i-soon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.8"/><path d="M12 8.6V12l2.4 1.7"/></symbol>
<symbol id="i-busy" viewBox="0 0 24 24"><path d="M7.5 12h9"/></symbol>
<symbol id="i-locked" viewBox="0 0 24 24"><rect x="7.2" y="11" width="9.6" height="7.2" rx="1.6"/><path d="M9.3 11V8.9a2.7 2.7 0 0 1 5.4 0V11"/></symbol>`;

/**
 * Renders one floor. Only rooms present in `statuses` are drawn, so the
 * caller decides what's visible (usable rooms + the user's own room).
 */
export function renderFloor(
  plan: FloorView,
  statuses: Map<string, Status>,
  location: string | null,
  street?: string,
): string {
  const all = plan.footprint;
  const cx = (Math.min(...all.map((r) => r.x0)) + Math.max(...all.map((r) => r.x1))) / 2;
  const cy = (Math.min(...all.map((r) => r.y0)) + Math.max(...all.map((r) => r.y1))) / 2;

  const p = (x: number, y: number, z = 0): Pt => {
    const dx = x - cx;
    const dy = y - cy;
    return [(dx - dy) * COS, (dx + dy) * COS * TILT - z];
  };
  const poly = (pts: Pt[], cls: string) =>
    `<polygon class="${cls}" points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"/>`;
  const top = (r: Rect, z: number) => [p(r.x0, r.y0, z), p(r.x1, r.y0, z), p(r.x1, r.y1, z), p(r.x0, r.y1, z)];
  // Faces pointing towards the viewer: east (x1) and south (y1).
  const east = (r: Rect, z0: number, z1: number) => [p(r.x1, r.y0, z1), p(r.x1, r.y1, z1), p(r.x1, r.y1, z0), p(r.x1, r.y0, z0)];
  const south = (r: Rect, z0: number, z1: number) => [p(r.x0, r.y1, z1), p(r.x1, r.y1, z1), p(r.x1, r.y1, z0), p(r.x0, r.y1, z0)];
  const depth = (r: Rect) => r.x0 + r.y0 + r.x1 + r.y1;

  // Building slab: all sides first, then all tops, so overlapping wings merge.
  const slabs = [...all].sort((a, b) => depth(a) - depth(b));
  let svg = slabs.map((r) => poly(east(r, -SLAB, 0), 'slab-e') + poly(south(r, -SLAB, 0), 'slab-s')).join('');
  svg += slabs.map((r) => poly(top(r, 0), 'slab-t')).join('');
  svg += plan.corridors.map((r) => poly(top(r, 0), 'corridor')).join('');
  svg += plan.restricted.map((r) => poly(top(r, 0), 'restricted')).join('');

  // Rooms as extruded blocks, back to front.
  const rooms = (plan.rooms ?? []).filter((rm) => statuses.has(rm.id)).sort((a, b) => depth(a) - depth(b));
  const labels: string[] = [];
  const labelBoxes: Pt[] = [];
  for (const room of rooms) {
    const status = statuses.get(room.id)!;
    const isHere = room.id === location;
    const h = isHere || status === 'free' || status === 'soon' ? ROOM_HIGH : ROOM_LOW;
    const r = { x0: room.x0 + INSET, y0: room.y0 + INSET, x1: room.x1 - INSET, y1: room.y1 - INSET };
    svg += `<g class="room ${status}${isHere ? ' here' : ''}">`;
    svg += poly(east(r, 0, h), 'e') + poly(south(r, 0, h), 's') + poly(top(r, h), 't');
    svg += '</g>';

    const [lx, ly] = p((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, h);
    // Badge reaches 61 above the anchor, the room number ~44 below it.
    const halfText = Math.max(27, room.id.length * 15);
    labelBoxes.push([lx - halfText, ly - 61], [lx + halfText, ly + 44]);
    labels.push(
      `<g class="label ${status}${isHere ? ' here' : ''}" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})">` +
        `<circle class="badge" cy="-34" r="27"/>` +
        `<use class="icon" href="#i-${status}" x="-21" y="-55" width="42" height="42"/>` +
        `<text y="32">${room.id}</text></g>`,
    );
  }
  svg += labels.join('');

  // Street name lying on the ground along the east side (reads bottom-left to
  // top-right). Not part of the viewBox, so it never shrinks the map.
  if (street) {
    const x = Math.max(...all.map((r) => r.x1)) + 140;
    const y = Math.max(...all.map((r) => r.y1)) - 150;
    const [tx, ty] = p(x, y);
    svg +=
      `<g transform="matrix(${COS} ${-COS * TILT} ${COS} ${COS * TILT} ${tx.toFixed(1)} ${ty.toFixed(1)})">` +
      `<text class="street">${street.toUpperCase()}</text></g>`;
  }

  if (plan.rooms === null) {
    svg += `<text class="unmapped" x="0" y="0">Plan not mapped yet</text>`;
  }

  // Tight viewBox around what is actually drawn (building + labels), so the
  // map is centred in the screen.
  const corners = [...all.flatMap((r) => [...top(r, ROOM_HIGH), ...top(r, -SLAB)]), ...labelBoxes];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const pad = 30;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];

  return `<svg class="map" viewBox="${vb.map((v) => v.toFixed(0)).join(' ')}" role="img" aria-label="Floor plan"><defs>${ICONS}${HATCH}</defs>${svg}</svg>`;
}
