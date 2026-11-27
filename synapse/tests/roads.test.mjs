import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRoadGrid, snapToRoad, BUS_ROADS } from "../src/app/anttra/busroutes/roads.ts";

// Identity projection: points are [lon, lat] = [x, z] in these synthetic roads.
const flat = (lat, lon) => [lon, lat];

test("snaps onto the nearest bus road and ignores footways", () => {
  const grid = buildRoadGrid([
    { type: "residential", points: [[0, 0], [100, 0]] },  // road along x
    { type: "footway", points: [[50, 3], [50, 60]] },     // path close by: must be ignored
  ], flat);
  const hit = snapToRoad(grid, 50, 4);
  assert.deepEqual([hit.x, hit.z], [50, 0]);
  assert.deepEqual([Math.sign(hit.dx), hit.dz], [1, 0]);   // direction of the road, not the path
  assert.equal(snapToRoad(grid, 50, 40), null);            // 40 units (120 m) off: no snap
});

test("a straight-line prediction past a bend stays on the road", () => {
  // L-shaped road: east along z=0, then north (negative z) at x=100.
  const grid = buildRoadGrid([{ type: "secondary", points: [[0, 0], [100, 0], [100, -100]] }], flat);
  // Bus heading east; straight extrapolation overshoots the corner to x=110.
  const hit = snapToRoad(grid, 110, -5);
  assert.ok(hit.x === 100 && hit.z <= 0, `expected on the north leg, got ${hit.x},${hit.z}`);
});

test("real Lerkendal network: drivable roads only, and near-road points snap within 45 m", () => {
  const { roads } = JSON.parse(readFileSync(new URL("../public/osm_lerkendal.json", import.meta.url), "utf8"));
  const M = 111000, LAT0 = 63.4122, LON0 = 10.3997, KX = Math.cos((LAT0 * Math.PI) / 180);
  const scene = (lat, lon) => [((lon - LON0) * M * KX) / 3, (-(lat - LAT0) * M) / 3];
  const grid = buildRoadGrid(roads, scene);
  const road = roads.find((r) => BUS_ROADS.has(r.type) && r.points.length > 3);
  const [x, z] = scene(road.points[1][1], road.points[1][0]);
  const hit = snapToRoad(grid, x + 6, z + 6);              // ~25 m off a real road node
  assert.ok(hit && Math.hypot(hit.x - x - 6, hit.z - z - 6) <= 15);
});
