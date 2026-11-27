'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { fetchVehicles, fetchStopDepartures } from './api/Departure/api';
interface OsmData {
  buildings: { footprint: [number,number][]; height: number; type: string }[];
  roads:     { points:   [number,number][]; type: string }[];
}

const CENTER_LAT    = 63.4122;
const CENTER_LON    = 10.3997;
const M_PER_DEG_LAT = 111000;
const M_PER_DEG_LON = 111000 * Math.cos(CENTER_LAT * Math.PI / 180);
const SCENE_SCALE   = 3; // metres per scene unit

// Portfolio palette (matches anttra/theme.css)
const C = {
  ground:     0x0b0f16,
  gridMajor:  0x223140,
  gridMinor:  0x151f2a,
  roadMain:   0x9cc0de,
  roadMid:    0x6688a6,
  roadMinor:  0x3d566e,
  civic:      0xb8d4ee,
  building:   0x86a5c3,
  liveBus:    0xff8a5c,
  unmonBus:   0xf0c060,
  platform:   0x8fd4ff, // Lerkendal platforms
  approach:   0x7ee0a8,
  depart:     0xff9db0,
  minorStop:  0xa3b0be,
  extraStop:  0x5f7a91,
  extraRing:  0x3a4f63,
  amber:      0xf0a050,
};
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

type StopKind = 'platform' | 'approach' | 'depart' | 'minor';
const KIND_COLOR: Record<StopKind, number> = {
  platform: C.platform, approach: C.approach, depart: C.depart, minor: C.minorStop,
};

function gpsToScene(lat: number, lon: number): [number, number] {
  return [
    (lon - CENTER_LON) * M_PER_DEG_LON / SCENE_SCALE,
    -(lat - CENTER_LAT) * M_PER_DEG_LAT / SCENE_SCALE,
  ];
}

const STOPS = [
  { label: 'Lerkendal 1',    desc: 'from city',        lat: 63.411853,          lon: 10.399434, quayId: 'NSR:Quay:73729'  },
  { label: 'Lerkendal 2',    desc: 'towards city',     lat: 63.411740,          lon: 10.399045, quayId: 'NSR:Quay:102720' },
  { label: 'Lerkendal 3',    desc: 'towards city',     lat: 63.412654,          lon: 10.399831, quayId: 'NSR:Quay:73421'  },
  { label: 'Lerkendal 4',    desc: 'from city',        lat: 63.412515,          lon: 10.400432, quayId: 'NSR:Quay:73420'  },
  { label: 'Hesthagen',      desc: 'approaching stop', lat: 63.416813603641200, lon: 10.397221457580931,    quayId: 'NSR:Quay:102719' },
  { label: 'Hesthagen',      desc: 'departing stop',   lat: 63.415498417151130, lon: 10.398147029114945,      quayId: 'NSR:Quay:71204'  },
  { label: 'Valøyvegen',     desc: 'departing stop',   lat: 63.407950831670080, lon: 10.398137286879060,      quayId: 'NSR:Quay:71982'  },
  { label: 'Valøyvegen',     desc: 'approaching stop', lat: 63.409554361708760, lon: 10.399296426408844,    quayId: 'NSR:Quay:71981'  },
  { label: 'Lerkendal gård', desc: 'departing stop',   lat: 63.413006,          lon: 10.409538,    quayId: 'NSR:Quay:73415'  },
  { label: 'Lerkendal gård', desc: 'approaching stop', lat: 63.412782,          lon: 10.407832,      quayId: 'NSR:Quay:73414'  },
  { label: 'Gløshaugen',             desc: '',  lat: 63.416835,           lon: 10.407556},
  { label: 'Studentersamfundet', desc: '',  lat: 63.422596,           lon: 10.394623},
  { label: 'Berg studentby',         desc: '',  lat: 63.413576,           lon: 10.414052},
  { label: 'Karl Jonssons veg',     desc: '', lat: 63.401536, lon: 10.408706},
  { label: 'Anton Grevskotts veg',  desc: '', lat: 63.403484, lon: 10.406089},
  { label: 'Sorgenfri',             desc: '', lat: 63.407686, lon: 10.403809},
  { label: 'Høgskoleringen',        desc: '', lat: 63.420867, lon: 10.404181},
  { label: 'St. Olavs hospital',    desc: '', lat: 63.420757, lon: 10.390046},
  { label: 'Bratsbergvegen',        desc: '', lat: 63.405387, lon: 10.397457},
  { label: 'Siemens',               desc: '', lat: 63.403719, lon: 10.398836},
  { label: 'Nyveibakken',           desc: '', lat: 63.423966, lon: 10.371359},
  { label: 'Tvetestien',            desc: '', lat: 63.417785, lon: 10.372038},
  { label: 'Marienborg stasjon',    desc: '', lat: 63.418056, lon: 10.382563},
  { label: 'Thaulowbakken',         desc: '', lat: 63.412656, lon: 10.382222},
  { label: 'Breidablikk',       desc: '', lat: 63.412383, lon: 10.376708},
  { label: 'Gudruns gate',          desc: '', lat: 63.425210, lon: 10.382784},
  { label: 'Ankers gate',           desc: '', lat: 63.424860, lon: 10.416855},
  { label: 'Strinda vgs.',          desc: '', lat: 63.422046, lon: 10.427611},
  { label: 'Nardosenteret',         desc: '', lat: 63.403569, lon: 10.426994},
  { label: 'Nardokrysset',          desc: '', lat: 63.406960, lon: 10.423778},
  { label: 'Sollia',                desc: '', lat: 63.399244, lon: 10.428297},
  { label: 'E-verket',              desc: '', lat: 63.398881, lon: 10.401320},
  { label: 'Nidarvoll skole',       desc: '', lat: 63.399155, lon: 10.404734},
  { label: 'Valgrindvegen',         desc: '', lat: 63.409468, lon: 10.402859},
  { label: 'Tempevegen 11',         desc: '', lat: 63.407804, lon: 10.396690},
  { label: 'Sluppen',               desc: '', lat: 63.401921, lon: 10.395796},
  { label: 'Trondheim hovedbrannstasjon', desc: '', lat: 63.399245, lon: 10.392889},
  { label: 'Hoem',                  desc: '', lat: 63.405573, lon: 10.382777},
  { label: 'Rognheim',              desc: '', lat: 63.399670, lon: 10.371500},
].map(s => {
  const [x, z] = gpsToScene(s.lat, s.lon);
  const kind: StopKind = s.label.startsWith('Lerkendal ') && /\d$/.test(s.label) ? 'platform'
    : s.desc === 'approaching stop' ? 'approach'
    : s.desc === 'departing stop'   ? 'depart'
    : 'minor';
  return { ...s, x, z, kind, color: KIND_COLOR[kind] };
});

const EXTRA_STOPS = ([
  { name: 'Karl Jonssons veg',             lat: 63.401536, lon: 10.408706 },
  { name: 'Karl Jonssons veg',             lat: 63.401403, lon: 10.408626 },
  { name: 'Anton Grevskotts veg',          lat: 63.403484, lon: 10.406089 },
  { name: 'Anton Grevskotts veg',          lat: 63.403844, lon: 10.405273 },
  { name: 'Sorgenfri',                     lat: 63.407686, lon: 10.403809 },
  { name: 'Sorgenfri',                     lat: 63.408158, lon: 10.403798 },
  { name: 'Høgskoleringen',                lat: 63.420867, lon: 10.404181 },
  { name: 'Høgskoleringen',                lat: 63.420675, lon: 10.404345 },
  { name: 'St. Olavs hospital øst',        lat: 63.420757, lon: 10.390046 },
  { name: 'St. Olavs hospital øst',        lat: 63.420565, lon: 10.390672 },
  { name: 'St. Olavs hospital vest',       lat: 63.420140, lon: 10.386390 },
  { name: 'St. Olavs hospital vest',       lat: 63.420240, lon: 10.386214 },
  { name: 'Bratsbergvegen',                lat: 63.405387, lon: 10.397457 },
  { name: 'Bratsbergvegen',                lat: 63.403358, lon: 10.395995 },
  { name: 'Siemens',                       lat: 63.403719, lon: 10.398836 },
  { name: 'Siemens',                       lat: 63.403907, lon: 10.399158 },
  { name: 'Nyveibakken',                   lat: 63.423966, lon: 10.371359 },
  { name: 'Nyveibakken',                   lat: 63.424582, lon: 10.370732 },
  { name: 'Tvetestien',                    lat: 63.417785, lon: 10.372038 },
  { name: 'Tvetestien',                    lat: 63.418174, lon: 10.372813 },
  { name: 'Marienborg stasjon',            lat: 63.418056, lon: 10.382563 },
  { name: 'Marienborg stasjon',            lat: 63.417816, lon: 10.382431 },
  { name: 'Marienborg stasjon (3)',        lat: 63.418820, lon: 10.382110 },
  { name: 'Marienborg',                    lat: 63.420000, lon: 10.377220 },
  { name: 'Marienborg',                    lat: 63.419179, lon: 10.377574 },
  { name: 'Thaulowbakken',                 lat: 63.412656, lon: 10.382222 },
  { name: 'Thaulowbakken',                 lat: 63.412857, lon: 10.382378 },
  { name: 'Breidablikkveien',              lat: 63.411088, lon: 10.382874 },
  { name: 'Breidablikkveien',              lat: 63.411228, lon: 10.382740 },
  { name: 'Breidablikk (3)',               lat: 63.412383, lon: 10.376708 },
  { name: 'Gudruns gate',                  lat: 63.425210, lon: 10.382784 },
  { name: 'Gudruns gate',                  lat: 63.425192, lon: 10.382576 },
  { name: 'Margretes gate',                lat: 63.423805, lon: 10.386485 },
  { name: 'Margretes gate',                lat: 63.423701, lon: 10.387090 },
  { name: 'Olav Kyrres gate',              lat: 63.420817, lon: 10.395515 },
  { name: 'Olav Kyrres gate',              lat: 63.420893, lon: 10.395006 },
  { name: 'Ankers gate',                   lat: 63.424860, lon: 10.416855 },
  { name: 'Ankers gate',                   lat: 63.424860, lon: 10.416655 },
  { name: 'Jonsvannsveien',                lat: 63.422610, lon: 10.413398 },
  { name: 'Jonsvannsveien',                lat: 63.422710, lon: 10.413242 },
  { name: 'Strinda vgs.',                  lat: 63.422046, lon: 10.427611 },
  { name: 'Bjarne Ness\' veg',             lat: 63.403824, lon: 10.429692 },
  { name: 'Nardosenteret',                 lat: 63.403569, lon: 10.426994 },
  { name: 'Nardosenteret',                 lat: 63.403333, lon: 10.427098 },
  { name: 'Nardokrysset',                  lat: 63.406960, lon: 10.423778 },
  { name: 'Nardokrysset',                  lat: 63.406281, lon: 10.424510 },
  { name: 'Omkjøringsveien Nardo',         lat: 63.407197, lon: 10.420690 },
  { name: 'Omkjøringsveien Nardo',         lat: 63.407524, lon: 10.423445 },
  { name: 'Fiolsvingen',                   lat: 63.409231, lon: 10.420476 },
  { name: 'Fiolsvingen',                   lat: 63.409025, lon: 10.420280 },
  { name: 'Tors veg',                      lat: 63.404835, lon: 10.427112 },
  { name: 'Steindalsvegen',                lat: 63.401170, lon: 10.428399 },
  { name: 'Steindalsvegen',                lat: 63.401157, lon: 10.428579 },
  { name: 'Sollia',                        lat: 63.399244, lon: 10.428297 },
  { name: 'E-verket',                      lat: 63.398726, lon: 10.401019 },
  { name: 'E-verket',                      lat: 63.398881, lon: 10.401320 },
  { name: 'Nidarvoll skole',               lat: 63.399155, lon: 10.404734 },
  { name: 'Valgrindvegen',                 lat: 63.409468, lon: 10.402859 },
  { name: 'Valgrindvegen',                 lat: 63.410365, lon: 10.402500 },
  { name: 'Sorgenfri',                     lat: 63.407686, lon: 10.403809 },
  { name: 'Tempevegen 11',                 lat: 63.407804, lon: 10.396690 },
  { name: 'Tempevegen 11',                 lat: 63.408087, lon: 10.397141 },
  { name: 'Tempe',                         lat: 63.403401, lon: 10.395612 },
  { name: 'Tempe',                         lat: 63.404822, lon: 10.396564 },
  { name: 'Sluppen',                       lat: 63.401921, lon: 10.395796 },
  { name: 'Sluppen',                       lat: 63.400950, lon: 10.395040 },
  { name: 'Trondheim hovedbrannstasjon',   lat: 63.399245, lon: 10.392889 },
  { name: 'Trondheim hovedbrannstasjon',   lat: 63.398801, lon: 10.392031 },
  { name: 'Nydalen',                       lat: 63.404563, lon: 10.386956 },
  { name: 'Nydalen',                       lat: 63.403445, lon: 10.387689 },
  { name: 'Hoem',                          lat: 63.405573, lon: 10.382777 },
  { name: 'Hoem',                          lat: 63.406137, lon: 10.382879 },
  { name: 'Rognheim',                      lat: 63.399670, lon: 10.371500 },
  { name: 'Rognheim',                      lat: 63.399749, lon: 10.371469 },
] as const).map(s => {
  const [x, z] = gpsToScene(s.lat, s.lon);
  return { label: s.name, desc: '', lat: s.lat, lon: s.lon, x, z, color: C.extraStop as number };
});

const ALL_STOPS = [...STOPS, ...EXTRA_STOPS];

const NOTIFY_LABELS = new Set(['Lerkendal 1','Lerkendal 2','Lerkendal 3','Lerkendal 4','Valøyvegen','Hesthagen','Lerkendal gård']);
const NOTIFY_STOPS  = ALL_STOPS.filter(s => NOTIFY_LABELS.has(s.label));

const BraindanceShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      vec2 aberr = normalize(center + 0.001) * dist * 0.006;
      float r = texture2D(tDiffuse, vUv + aberr).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - aberr).b;
      float scan    = sin(vUv.y * 700.0) * 0.012;
      float gate    = pow(sin(time * 2.0) * 0.5 + 0.5, 20.0);
      float flicker = (sin(time * 31.0) * sin(time * 7.3) * 0.012) * gate;
      float vig     = smoothstep(0.85, 0.3, dist);
      vec3 col = vec3(r, g, b);
      col -= scan; col += flicker; col *= vig;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};


// Building wireframe from real footprint
function buildingLines(
  footprint: [number, number][],
  height: number,
  color: number,
  opacity: number,
): THREE.LineSegments {
  const verts: number[] = [];
  const n = footprint.length;
  for (let i = 0; i < n - 1; i++) {
    const [ax, az] = gpsToScene(footprint[i][1], footprint[i][0]);
    const [bx, bz] = gpsToScene(footprint[(i + 1) % (n - 1)][1], footprint[(i + 1) % (n - 1)][0]);
    const h = height / SCENE_SCALE;
    verts.push(ax, 0, az, bx, 0, bz);
    verts.push(ax, h, az, bx, h, bz);
    verts.push(ax, 0, az, ax, h, az);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

// Readable HTML sign above each stop: colour bar (with platform no. at Lerkendal), name, direction.
function stopSign(stop: { label: string; desc: string; kind: StopKind; color: number }, onOpen: () => void): CSS2DObject {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'stop-sign';
  el.dataset.kind = stop.kind;
  el.style.setProperty('--sign', hex(stop.color));
  el.setAttribute('aria-label', `${stop.label}${stop.desc ? ', ' + stop.desc : ''}: show departures`);
  const platformNo = stop.kind === 'platform' ? stop.label.match(/\d+$/)?.[0] : undefined;
  const name = platformNo ? 'Lerkendal' : stop.label;
  const desc = platformNo ? `Platform ${platformNo} · ${stop.desc}` : stop.desc;
  const badge = document.createElement('span');
  badge.className = 'stop-sign__badge';
  if (platformNo) badge.textContent = platformNo; // other stops: badge stays empty = plain colour bar
  const text = document.createElement('span');
  text.className = 'stop-sign__text';
  const nameEl = document.createElement('span');
  nameEl.className = 'stop-sign__name';
  nameEl.textContent = name;
  text.append(nameEl);
  if (desc) {
    const descEl = document.createElement('span');
    descEl.className = 'stop-sign__desc';
    descEl.textContent = desc;
    text.append(descEl);
  }
  el.append(badge, text);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => { e.stopPropagation(); onOpen(); });
  const obj = new CSS2DObject(el);
  obj.center.set(0.5, 1); // sign sits on top of the beacon
  obj.position.set(0, 3.1, 0);
  return obj;
}

function stopMarker(color: number): THREE.Group {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.3 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; group.add(ring);
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.18 }));
  pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.01; pulse.userData.isPulse = true; group.add(pulse);
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.02, 0, 0, 2.8, 0], 3));
  group.add(new THREE.LineSegments(beaconGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })));
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
  sphere.position.y = 2.8; group.add(sphere);
  const light = new THREE.PointLight(color, 0.4, 6);
  light.position.y = 2.8; group.add(light);
  return group;
}

// Bus = flat arrow on the road (shows heading) + floating HTML badge with the line number
// (always faces the camera, never flips or blurs).
function busMarker(line: string, color: number): THREE.Group {
  const group = new THREE.Group();
  const arrowGeo = new THREE.BufferGeometry();
  arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute([
     0,   0.06, -3.5, // tip
     2.0, 0.06,  2.2, // right wing
     0,   0.06,  0.8, // notch
    -2.0, 0.06,  2.2, // left wing
  ], 3));
  arrowGeo.setIndex([0, 1, 2, 0, 2, 3]);
  group.add(new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false,
  })));

  const el = document.createElement('span');
  el.className = 'bus-badge';
  el.textContent = line;
  el.style.setProperty('--bus', hex(color));
  const badge = new CSS2DObject(el);
  badge.center.set(0.5, 1);
  badge.position.set(0, 1.2, 0);
  group.add(badge);
  return group;
}

// Removing a group from the scene leaves nested CSS2D elements in the DOM; drop them explicitly.
function disposeMarker(group: THREE.Object3D) {
  group.traverse(o => { if (o instanceof CSS2DObject) o.element.remove(); });
  group.removeFromParent();
}


function headingToNearestStop(bx: number, bz: number): number {
  let best = STOPS[0]; let bestD = Infinity;
  for (const s of STOPS) {
    const d = Math.hypot(bx - s.x, bz - s.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return -Math.atan2(best.x - bx, -(best.z - bz));
}

// ── Bus motion between Entur reports (dead reckoning) ──────────────────────
// Entur may only be polled every 25 s. Between reports each bus keeps moving at the
// velocity measured from its last two reports; when a new report lands, the gap between
// where we drew the bus and where it really is gets eased out instead of snapped.
interface Track {
  fixX: number; fixZ: number; fixT: number; // last report: scene position + time (ms epoch)
  vx: number; vz: number;                   // estimated velocity, scene units per second
  offX: number; offZ: number; offT: number; // correction being eased out, and when it started
  heading: number;                          // target rotation.y
}
const MAX_PREDICT_S = 30;      // stop extrapolating if a report is late
const MIN_MOVE      = 2;       // < 6 m between reports = standing still
const MAX_SPEED     = 25 / 3;  // 25 m/s in scene units: ignore GPS jumps above this
const EASE_MS       = 3000;    // how long a correction takes to fade (slower = less abrupt slide-back after an unseen stop)

function predictedPos(tr: Track, nowMs: number): [number, number] {
  const e = Math.min(Math.max((nowMs - tr.fixT) / 1000, 0), MAX_PREDICT_S);
  const k = Math.max(0, 1 - (nowMs - tr.offT) / EASE_MS);
  const ease = k * k * (3 - 2 * k); // smoothstep: correction fades gently
  return [tr.fixX + tr.vx * e + tr.offX * ease, tr.fixZ + tr.vz * e + tr.offZ * ease];
}

const bearingToHeading = (deg: number) => -deg * Math.PI / 180;           // compass bearing → rotation.y
const velocityHeading  = (vx: number, vz: number) => -Math.atan2(vx, -vz); // same convention as headingToNearestStop

function trackFromReport(prev: Track | undefined, x: number, z: number, reportT: number, bearing: number, nowMs: number): Track {
  const fixT = reportT || nowMs;
  if (!prev) {
    const heading = bearing ? bearingToHeading(bearing) : headingToNearestStop(x, z);
    return { fixX: x, fixZ: z, fixT, vx: 0, vz: 0, offX: 0, offZ: 0, offT: 0, heading };
  }
  if (fixT <= prev.fixT) return prev; // same report as last poll: keep predicting
  const dt = (fixT - prev.fixT) / 1000;
  let vx = (x - prev.fixX) / dt, vz = (z - prev.fixZ) / dt;
  const moved = Math.hypot(x - prev.fixX, z - prev.fixZ);
  const speed = moved / dt;
  if (moved < MIN_MOVE) { vx = 0; vz = 0; }
  else if (speed > MAX_SPEED) { vx *= MAX_SPEED / speed; vz *= MAX_SPEED / speed; }
  const heading = vx || vz ? velocityHeading(vx, vz) : bearing ? bearingToHeading(bearing) : prev.heading;
  // Where the bus is drawn right now, versus where the new report + velocity puts it.
  const [shownX, shownZ] = predictedPos(prev, nowMs);
  const next: Track = { fixX: x, fixZ: z, fixT, vx, vz, offX: 0, offZ: 0, offT: nowMs, heading };
  const [newX, newZ] = predictedPos(next, nowMs);
  next.offX = shownX - newX; next.offZ = shownZ - newZ;
  return next;
}

// Turn toward the target heading along the shortest way round.
function turnToward(current: number, target: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, dt * 4);
}

interface ArrivalNotif  { id: string; stop: string; desc: string; line: string; color: number; time: string }

const ARRIVE_DIST     = 33;
const ARRIVE_COOLDOWN = 60_000;

export default function CyberpunkMap({ refreshKey }: { refreshKey?: number }) {
  const mountRef      = useRef<HTMLDivElement>(null);
  const updateVehiclesRef = useRef<(() => Promise<void>) | null>(null);
  const activeRef     = useRef(true);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef     = useRef<OrbitControls | null>(null);
  const gyroContainerRef = useRef<HTMLDivElement | null>(null);
  const gyroRendRef      = useRef<THREE.WebGLRenderer | null>(null);
  const gyroScRef        = useRef<THREE.Scene | null>(null);
  const gyroCamRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const gyroCompassRef      = useRef<THREE.Group | null>(null);
  const gyroPitchMarkerRef  = useRef<THREE.Mesh | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const vehicleMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const pulseMeshes   = useRef<THREE.Mesh[]>([]);
  const stopMeshes    = useRef<THREE.Group[]>([]);
  const recentArrivals = useRef<Map<string, number>>(new Map());
  const [arrivals, setArrivals] = useState<ArrivalNotif[]>([]);
  const [busStatus, setBusStatus] = useState<{
    state: 'idle' | 'fetching' | 'ok' | 'error';
    count: number; loadMs: number | null; lastUpdated: string | null;
    error: string | null; activeLines: string[];
  }>({ state: 'idle', count: 0, loadMs: null, lastUpdated: null, error: null, activeLines: [] });
  const [stopPanel, setStopPanel] = useState<{
    label: string; desc: string; color: number;
    departures: { time: string; line: string; dest: string }[];
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(C.ground);
    mount.appendChild(renderer.domElement);

    // HTML layer for the stop signs: crisp text, untouched by bloom and post-processing
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W, H);
    Object.assign(labelRenderer.domElement.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '6',
    });
    mount.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(C.ground, 0.0018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1200);
    camera.position.set(200, 110, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.enablePan = true; controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshBasicMaterial({ color: C.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const grid = new THREE.GridHelper(1000, 1000, C.gridMajor, C.gridMinor);
    scene.add(grid);

    const openStop = (group: THREE.Group) => {
      const { stopLabel, stopDesc, stopColor, quayId } = group.userData;
      setStopPanel({ label: stopLabel, desc: stopDesc, color: stopColor, departures: [], loading: !!quayId });
      if (quayId) {
        fetchStopDepartures(quayId)
          .then(deps => setStopPanel(p => p ? { ...p, loading: false, departures: deps } : null))
          .catch(() => setStopPanel(p => p ? { ...p, loading: false } : null));
      }
    };

    const signs: { obj: CSS2DObject; kind: StopKind }[] = [];
    STOPS.forEach(stop => {
      const marker = stopMarker(stop.color);
      marker.position.set(stop.x, 0, stop.z);
      marker.userData.stopLabel = stop.label;
      marker.userData.stopDesc  = stop.desc;
      marker.userData.stopColor = stop.color;
      marker.userData.quayId    = (stop as any).quayId ?? null;
      marker.traverse(obj => { if (obj.userData.isPulse) pulseMeshes.current.push(obj as THREE.Mesh); });
      const sign = stopSign(stop, () => openStop(marker));
      marker.add(sign);
      signs.push({ obj: sign, kind: stop.kind });
      stopMeshes.current.push(marker);
      scene.add(marker);
    });

    {
      const N = EXTRA_STOPS.length;

      // Dots
      const pos = new Float32Array(N * 3);
      EXTRA_STOPS.forEach((s, i) => { pos[i*3] = s.x; pos[i*3+1] = 0.5; pos[i*3+2] = s.z; });
      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: C.extraStop, size: 2.5, sizeAttenuation: true })));

      // Ground rings
      const ringGeo = new THREE.RingGeometry(0.22, 0.26, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: C.extraRing, side: THREE.DoubleSide });
      const rings   = new THREE.InstancedMesh(ringGeo, ringMat, N);
      rings.instanceMatrix.needsUpdate = true;
      scene.add(rings);
    }

    scene.add(new THREE.AmbientLight(0x110022, 0.5));

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.4, 0.1));
    const braindance = new ShaderPass(BraindanceShader);
    composer.addPass(braindance);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Zoomed out: compact signs plus the grey outlying stops. Zoomed in: full signs, grey stops hidden.
    // The four Lerkendal platforms sit ~30 m apart, so they need a closer zoom before expanding.
    const SIGN_DETAIL_DIST    = 160;
    const PLATFORM_DETAIL_DIST = 70;
    let signsZoom = -1;

    let lastFrame = performance.now();

    let alive = true;
    let t = 0;
    const animate = () => {
      if (!alive || !activeRef.current) return;
      requestAnimationFrame(animate);
      t += 0.016;
      braindance.uniforms.time.value = t;
      controls.update();
      {
        const dx = camera.position.x - controls.target.x;
        const dy = camera.position.y - controls.target.y;
        const dz = camera.position.z - controls.target.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (gyroCompassRef.current) {
          const horiz = Math.sqrt(dx * dx + dz * dz);
          const heading = Math.atan2(-dx, dz);
          const pitch   = Math.atan2(dy, horiz);
          const qHeading = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), heading,
          );
          const qPitch = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), pitch,
          );
          gyroCompassRef.current.quaternion.multiplyQuaternions(qPitch, qHeading);
        }
        if (gyroRendRef.current && gyroScRef.current && gyroCamRef.current)
          gyroRendRef.current.render(gyroScRef.current, gyroCamRef.current);
      }
      for (const pulse of pulseMeshes.current) {
        const scale = 1 + (Math.sin(t * 2 + pulse.parent!.position.x) * 0.5 + 0.5) * 1.2;
        pulse.scale.setScalar(scale);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.5 - (scale - 1) * 0.25;
      }
      const camDist = camera.position.length();
      const busScale = Math.max(1.5, camDist / 100);
      const frameNow = performance.now();
      const dt = Math.min((frameNow - lastFrame) / 1000, 1); // generous cap: keeps pace in throttled tabs
      lastFrame = frameNow;
      const wallNow = Date.now(); // same clock as the report times
      for (const [, group] of vehicleMeshes.current) {
        group.scale.setScalar(busScale);
        const track = group.userData.track as Track | undefined;
        if (!track) continue;
        const [x, z] = predictedPos(track, wallNow);
        group.position.set(x, 0, z);
        group.rotation.y = turnToward(group.rotation.y, track.heading, dt);
      }
      const stopScale = Math.max(1, camDist / 80);
      for (const group of stopMeshes.current) group.scale.setScalar(stopScale);
      const viewDist = camera.position.distanceTo(controls.target);
      const zoom = viewDist > SIGN_DETAIL_DIST ? 0 : viewDist > PLATFORM_DETAIL_DIST ? 1 : 2;
      if (zoom !== signsZoom) {
        signsZoom = zoom;
        for (const { obj, kind } of signs) {
          obj.element.classList.toggle('is-far', kind === 'platform' ? zoom < 2 : zoom < 1);
          obj.visible = kind !== 'minor' || zoom === 0; // grey stops: overview only
        }
      }
      composer.render();
      labelRenderer.render(scene, camera);
    };
    animate();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownX = 0, mouseDownY = 0;
    const onMouseDown = (e: MouseEvent) => { mouseDownX = e.clientX; mouseDownY = e.clientY; };
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY) > 5) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hitObjects = stopMeshes.current.flatMap(g => g.children.filter(c => c instanceof THREE.Mesh));
      const hits = raycaster.intersectObjects(hitObjects);
      if (hits.length === 0) { setStopPanel(null); return; }
      openStop(hits[0].object.parent as THREE.Group);
    };
    mount.addEventListener('mousedown', onMouseDown);
    mount.addEventListener('click', onClick);

    return () => {
      activeRef.current = false;
      alive = false; // stops this effect's loop even if a remount turns activeRef back on
      sceneRef.current  = null;
      cameraRef.current = null;
      controlsRef.current = null;
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousedown', onMouseDown);
      mount.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);
      vehicleMeshes.current.clear();
      pulseMeshes.current = [];
      stopMeshes.current  = [];
    };
  }, []);

  useEffect(() => {
    let worker: Worker | null = null;
    let cancelled = false;

    fetch('/osm_lerkendal.json')
      .then(r => r.json() as Promise<OsmData>)
      .then(data => {
        if (cancelled) return;
        worker = new Worker(new URL('./mapWorker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (e: MessageEvent<{
          bright: Float32Array; mid: Float32Array; dim: Float32Array;
          civic: Float32Array[]; resid: Float32Array[];
        }>) => {
          const scene = sceneRef.current;
          if (cancelled || !scene) return;

          const { bright, mid, dim, civic, resid } = e.data;

          const addLines = (buf: Float32Array, color: number, transparent: boolean, opacity: number) => {
            if (!buf.length) return;
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(buf, 3));
            geo.computeBoundingSphere();
            scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent, opacity })));
          };
          addLines(bright, C.roadMain,  false, 1);
          addLines(mid,    C.roadMid,   true,  0.85);
          addLines(dim,    C.roadMinor, true,  0.7);

          for (const buf of civic) addLines(buf, C.civic, true, 0.95);
          for (const buf of resid) addLines(buf, C.building, true, 0.85);

          worker?.terminate();
          worker = null;
        };

        worker.postMessage(data);
      })
      .catch(() => { /* silently ignore */ });

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, []);

  useEffect(() => {
    const update = async () => {
      if (!activeRef.current) return;
      const scene = sceneRef.current;
      if (!scene) return;
      setBusStatus(s => ({ ...s, state: 'fetching' }));
      const t0 = Date.now();
      try {
        const vehicles = await fetchVehicles();
        const loadMs = Date.now() - t0;
        const seen = new Set<string>();
        const now  = Date.now();
        for (const v of vehicles) {
          seen.add(v.id);
          const [x, z] = gpsToScene(v.lat, v.lon);
          const color = v.monitored ? C.liveBus : C.unmonBus;
          let mesh = vehicleMeshes.current.get(v.id);
          if (!mesh) {
            mesh = busMarker(v.line || '?', color);
            scene.add(mesh);
            vehicleMeshes.current.set(v.id, mesh);
          }
          // The render loop moves the bus; here we only feed it the new report.
          const track = trackFromReport(mesh.userData.track as Track | undefined, x, z, v.recordedAt, v.bearing, now);
          if (!mesh.userData.track) {
            mesh.position.set(x, 0, z);
            mesh.rotation.y = track.heading;
          }
          mesh.userData.track = track;
          mesh.userData.line = v.line;

          for (const stop of NOTIFY_STOPS) {
            if (Math.hypot(x - stop.x, z - stop.z) < ARRIVE_DIST) {
              const key  = `${v.id}:${stop.label}:${stop.desc}`;
              const last = recentArrivals.current.get(key) ?? 0;
              if (now - last > ARRIVE_COOLDOWN) {
                recentArrivals.current.set(key, now);
                const nid = `${key}:${now}`;
                const time = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
                setArrivals(prev => [...prev.slice(-9), { id: nid, stop: stop.label, desc: stop.desc, line: v.line || '?', color: stop.color, time }]);
              }
            }
          }
        }
        for (const [id, mesh] of vehicleMeshes.current) {
          if (!seen.has(id)) { disposeMarker(mesh); vehicleMeshes.current.delete(id); }
        }
        const activeLines = [...new Set(
          [...vehicleMeshes.current.values()]
            .map(m => m.userData.line as string)
            .filter(Boolean)
        )].sort();
        const lastUpdated = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setBusStatus({ state: 'ok', count: vehicleMeshes.current.size, loadMs, lastUpdated, error: null, activeLines });
      } catch (err: any) {
        setBusStatus(s => ({ ...s, state: 'error', error: String(err?.message ?? err) }));
      }
    };
    updateVehiclesRef.current = update;
    update();
    const id = setInterval(update, 25_000);
    return () => { clearInterval(id); updateVehiclesRef.current = null; };
  }, []);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) updateVehiclesRef.current?.();
  }, [refreshKey]);

  useEffect(() => {
    const container = gyroContainerRef.current;
    if (!container) return;
    const SIZE = 96;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    cam.position.set(0, 1.2, 5.0);
    cam.lookAt(0, 0, 0);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.032, 8, 64),
      new THREE.MeshBasicMaterial({ color: C.platform, transparent: true, opacity: 0.35 }),
    );
    ringMesh.rotation.x = Math.PI / 2;
    const gyroGrid = new THREE.GridHelper(120, 100, C.gridMajor, C.gridMinor);

    const tickGroup = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const major = i % 4 === 0;
      const r0 = major ? 1.0 : 1.0;
      const r1 = major ? 1.3 : 1.2;
      const sa = Math.sin(a), ca = Math.cos(a);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([sa*r0,0,-ca*r0, sa*r1,0,-ca*r1], 3));
      tickGroup.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: major ? C.platform : C.extraRing, transparent: true, opacity: major ? 0.75 : 0.35,
      })));
    }

    const dotGroup = new THREE.Group();
    ([
      [0,          C.liveBus,  0.095],
      [Math.PI/2,  C.platform, 0.06],
      [Math.PI,    C.platform, 0.06],
      [-Math.PI/2, C.platform, 0.06],
    ] as [number, number, number][]).forEach(([a, color, r]) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 8),
        new THREE.MeshBasicMaterial({ color }),
      );
      dot.position.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
      dotGroup.add(dot);
    });

    const compassGroup = new THREE.Group();
    compassGroup.add(ringMesh, tickGroup, dotGroup, gyroGrid);
    scene.add(compassGroup);

    const spinRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.028, 8, 64),
      new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0.45 }),
    );
    spinRing.rotation.y = Math.PI / 2;
    compassGroup.add(spinRing);

    const pitchMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    pitchMarker.position.set(0, 0, -1.2);
    compassGroup.add(pitchMarker);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    gyroRendRef.current       = renderer;
    gyroScRef.current         = scene;
    gyroCamRef.current        = cam;
    gyroCompassRef.current    = compassGroup;
    gyroPitchMarkerRef.current = pitchMarker;

    return () => {
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      gyroRendRef.current = null; gyroScRef.current = null;
      gyroCamRef.current = null; gyroCompassRef.current = null; gyroPitchMarkerRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />

      <div style={{
        position: 'absolute', 
        inset: 0, 
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.12,
        mixBlendMode: 'overlay',
        zIndex: 5,
      }} />

      <div style={{
        position: 'absolute', top: '0.75rem', left: '0.75rem',
        fontFamily: 'monospace', fontSize: isMobile ? '0.58rem' : '0.65rem', letterSpacing: '0.08em',
        color: 'var(--portfolio-blue)', background: 'var(--portfolio-surface)',
        border: '1px solid var(--portfolio-line)', padding: isMobile ? '0.35rem 0.5rem' : '0.5rem 0.8rem',
        lineHeight: 1.8, pointerEvents: 'none', zIndex: 10,
        minWidth: isMobile ? 'auto' : '160px',
        maxWidth: isMobile ? 'calc(50vw - 1rem)' : undefined,
      }}>
        <div>
          <span style={{ opacity: 0.5 }}>STATE </span>
          <span style={{ color: busStatus.state === 'ok' ? 'var(--portfolio-blue)' : busStatus.state === 'error' ? '#ffad96' : 'var(--portfolio-amber)' }}>
            {busStatus.state.toUpperCase()}
          </span>
        </div>
        <div><span style={{ opacity: 0.5 }}>BUSES </span>{busStatus.count}</div>
        {busStatus.loadMs !== null && !isMobile && <div><span style={{ opacity: 0.5 }}>LOAD </span>{busStatus.loadMs}ms</div>}
        {busStatus.lastUpdated && <div><span style={{ opacity: 0.5 }}>UPD </span>{busStatus.lastUpdated}</div>}
        {busStatus.activeLines.length > 0 && (
        <div style={{ marginTop: '0.3rem' }}>
          <div style={{ opacity: 0.5, marginBottom: '0.1rem' }}>LINES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {busStatus.activeLines.map(l => (
              <span
                key={l}
                style={{
                  flex: '0 1 auto',
                  background: 'rgba(240,160,80,0.12)',
                  border: '1px solid rgba(240,160,80,0.4)',
                  color: 'var(--portfolio-amber)',
                  padding: '0 4px'
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
        )}
        {busStatus.error && <div style={{ color: '#ffad96', marginTop: '0.2rem' }}>{busStatus.error}</div>}
      </div>

      {!isMobile && arrivals.length >= 0 && (
        <div style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.07em',
          background: 'rgba(18,25,35,0.92)', border: '1px solid var(--portfolio-line)',
          pointerEvents: 'none', zIndex: 10, minWidth: '260px',
        }}>
          <div style={{ padding: '0.3rem 0.6rem', opacity: 0.5, borderBottom: '1px solid var(--portfolio-line)', textTransform: 'uppercase' }}>arrivals</div>
          <div style={{ display: 'grid', gridTemplateColumns: '3rem 2.5rem 1fr 5rem', gap: '0 0.5rem', padding: '0.2rem 0.6rem' }}>
            {arrivals.map((a, i) => {
              const isNewest = i === arrivals.length - 1;
              return (
                <Fragment key={a.id}>
                  <span style={{ color: '#ffffff', opacity: isNewest ? 1 : 0.6 }}>{a.time}</span>
                  <span style={{ color: 'var(--portfolio-amber)', opacity: isNewest ? 1 : 0.6 }}>{a.line}</span>
                  <span style={{ color: hex(a.color), opacity: isNewest ? 1 : 0.6, textTransform: 'uppercase' }}>{a.stop}</span>
                  <span style={{ color: '#cce8ff', opacity: isNewest ? 0.8 : 0.4, fontSize: '0.58rem' }}>{a.desc}</span>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {stopPanel && (
        <div style={{
          position: 'absolute',
          bottom: isMobile ? 0 : '1.2rem',
          left: isMobile ? 0 : '50%',
          right: isMobile ? 0 : 'auto',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.07em',
          background: 'rgba(18,25,35,0.96)', border: `1px solid ${hex(stopPanel.color)}88`,
          minWidth: isMobile ? 'unset' : '280px', pointerEvents: 'auto', zIndex: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.7rem', borderBottom: `1px solid ${hex(stopPanel.color)}44` }}>
            <span style={{ color: hex(stopPanel.color), textTransform: 'uppercase' }}>
              {stopPanel.label}{stopPanel.desc ? ` · ${stopPanel.desc}` : ''}
            </span>
            <span style={{ cursor: 'pointer', opacity: 0.5, padding: '0 0.25rem' }} onClick={() => setStopPanel(null)}>×</span>
          </div>
          {stopPanel.loading ? (
            <div style={{ padding: '0.5rem 0.7rem', opacity: 0.5 }}>loading...</div>
          ) : stopPanel.departures.length === 0 ? (
            <div style={{ padding: '0.5rem 0.7rem', opacity: 0.5 }}>no departures found</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '3.5rem 2.5rem 1fr', gap: '0 0.5rem', padding: '0.35rem 0.7rem' }}>
              {stopPanel.departures.map((d, i) => (
                <Fragment key={i}>
                  <span style={{ color: '#ffffff' }}>{d.time}</span>
                  <span style={{ color: 'var(--portfolio-amber)' }}>{d.line}</span>
                  <span style={{ color: '#cce8ff', textTransform: 'uppercase' }}>{d.dest}</span>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: '1.2rem', left: '1.2rem',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
        transform: isMobile ? 'scale(0.65)' : undefined,
        transformOrigin: 'bottom left', zIndex: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <div
            ref={gyroContainerRef}
            style={{
              width: 96, height: 96,
              borderRadius: '50%', overflow: 'hidden',
              background: 'rgba(11,15,22,0.85)',
              border: '1px solid var(--portfolio-line)',
              pointerEvents: 'none',
            }}
          />
          <button
            onClick={() => {
              const cam = cameraRef.current;
              const ctrl = controlsRef.current;
              if (!cam || !ctrl) return;
              cam.position.set(200, 110, 0);
              ctrl.target.set(0, 0, 0);
              ctrl.update();
            }}
            style={{
              fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.1em',
              color: 'var(--portfolio-blue)', background: 'var(--portfolio-surface)',
              border: '1px solid var(--portfolio-line)', padding: '0.2rem 0.7rem',
              cursor: 'pointer', textTransform: 'uppercase', pointerEvents: 'auto',
            }}
          >
            reset view
          </button>
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '1.0rem',
          color: 'var(--portfolio-blue)', opacity: 0.65, letterSpacing: '0.1em',
          textTransform: 'uppercase', lineHeight: 1.6, pointerEvents: 'none',
        }}>
          <div>lerkendal</div>
          <div style={{ color: '#ffad96' }}>trondheim · atb</div>
        </div>
      </div>

      {!isMobile && (
      <div style={{
        position: 'absolute', bottom: '1.2rem', right: '1.2rem',
        fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--portfolio-text)',
        letterSpacing: '0.05em', lineHeight: 1.7, padding: '0.35rem 0.7rem',
        display: 'grid', gridTemplateColumns: 'auto auto', columnGap: '1rem',
        background: 'rgba(18,25,35,0.85)', border: '1px solid var(--portfolio-line)',
        pointerEvents: 'none', zIndex: 10,
      }}>
        {([
          ['▲', C.liveBus,  'live bus'],
          ['▲', C.unmonBus, 'unmonitored bus'],
          ['■', C.platform, 'Lerkendal platform'],
          ['■', C.approach, 'approaching stop'],
          ['■', C.depart,   'departing stop'],
          ['■', C.minorStop,'other stop'],
        ] as const).map(([glyph, color, label]) => (
          <div key={label}><span style={{ color: hex(color), marginRight: '0.5rem' }}>{glyph}</span>{label}</div>
        ))}
      </div>
      )}
    </div>
  );
}
