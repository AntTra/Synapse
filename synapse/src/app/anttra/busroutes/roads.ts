// Keeps predicted bus positions on the street network: the nearest point on a road a bus can
// drive, plus that road's direction. Pure functions, so tests/roads.test.mjs can run them.

// OSM highway types buses use here. Service roads (car parks, driveways), footways,
// cycleways and paths are left out so buses never snap onto them.
export const BUS_ROADS = new Set([
  'trunk', 'trunk_link', 'primary', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link', 'unclassified', 'residential',
]);

const CELL = 20;     // grid cell, scene units (60 m)
const SNAP_MAX = 15; // snap only within 45 m; farther off means a road we don't have

export type RoadGrid = Map<string, number[]>; // cell key → flat [x0, z0, x1, z1, ...]

// Segments are indexed in every grid cell their bounding box touches.
export function buildRoadGrid(
  roads: { points: [number, number][]; type: string }[],
  project: (lat: number, lon: number) => [number, number],
): RoadGrid {
  const grid: RoadGrid = new Map();
  for (const road of roads) {
    if (!BUS_ROADS.has(road.type)) continue;
    for (let i = 0; i < road.points.length - 1; i++) {
      const [x0, z0] = project(road.points[i][1], road.points[i][0]); // OSM points are [lon, lat]
      const [x1, z1] = project(road.points[i + 1][1], road.points[i + 1][0]);
      for (let cx = Math.floor(Math.min(x0, x1) / CELL); cx <= Math.floor(Math.max(x0, x1) / CELL); cx++) {
        for (let cz = Math.floor(Math.min(z0, z1) / CELL); cz <= Math.floor(Math.max(z0, z1) / CELL); cz++) {
          const key = `${cx},${cz}`;
          let cell = grid.get(key);
          if (!cell) grid.set(key, (cell = []));
          cell.push(x0, z0, x1, z1);
        }
      }
    }
  }
  return grid;
}

// Nearest point on a bus road within SNAP_MAX, with the road's direction (dx, dz);
// null when nothing is that close. SNAP_MAX < CELL, so the 3x3 cell neighbourhood is enough.
export function snapToRoad(grid: RoadGrid, x: number, z: number) {
  let best = SNAP_MAX * SNAP_MAX;
  let hit: { x: number; z: number; dx: number; dz: number } | null = null;
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const segs = grid.get(`${cx + i},${cz + j}`);
      if (!segs) continue;
      for (let k = 0; k < segs.length; k += 4) {
        const x0 = segs[k], z0 = segs[k + 1], dx = segs[k + 2] - x0, dz = segs[k + 3] - z0;
        const len2 = dx * dx + dz * dz;
        const t = len2 ? Math.min(1, Math.max(0, ((x - x0) * dx + (z - z0) * dz) / len2)) : 0;
        const px = x0 + dx * t, pz = z0 + dz * t;
        const d2 = (x - px) ** 2 + (z - pz) ** 2;
        if (d2 < best) { best = d2; hit = { x: px, z: pz, dx, dz }; }
      }
    }
  }
  return hit;
}
