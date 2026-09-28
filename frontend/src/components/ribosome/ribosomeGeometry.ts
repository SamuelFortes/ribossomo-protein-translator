import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

// Scene layout, in world units. The mRNA runs along +x (5' -> 3') through the small subunit,
// the A/P/E sites sit one codon apart and the exit tunnel climbs through the large subunit.
export const NT_SPACING = 0.28;
export const CODON_WIDTH = NT_SPACING * 3;
export const SITE_X = { E: -1.26, P: -0.42, A: 0.42 } as const;
export const MRNA_Y = -0.62;
export const MRNA_Z = 0.2;
export const FLAT_HALF_WIDTH = 2.3;
export const PTC = new THREE.Vector3(0, 1.12, -0.58);
export const TUNNEL_END = new THREE.Vector3(0.15, 3.95, -0.25);
export const TRNA_CCA = new THREE.Vector3(0, 1.08, -0.55);
export const RESIDUE_SPACING = 0.34;
export const SMALL_PIVOT = new THREE.Vector3(0.15, -1.4, -0.25);

export interface AtomCloud {
  count: number;
  positions: Float32Array;
  radii: Float32Array;
  colors: Float32Array;
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Math.hypot is several times slower than sqrt in V8, and these run ~10^6 times per build.
const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

function sdEllipsoid(px: number, py: number, pz: number, rx: number, ry: number, rz: number): number {
  const k0 = len3(px / rx, py / ry, pz / rz);
  const k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

function sdCapsule(
  px: number, py: number, pz: number,
  a: THREE.Vector3, b: THREE.Vector3, r: number,
): number {
  const pax = px - a.x, pay = py - a.y, paz = pz - a.z;
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

function sdRoundBox(px: number, py: number, pz: number, hx: number, hy: number, hz: number, r: number): number {
  const qx = Math.abs(px) - hx + r;
  const qy = Math.abs(py) - hy + r;
  const qz = Math.abs(pz) - hz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function makeFbm(seed: number) {
  const noise = new SimplexNoise({ random: seededRandom(seed) });
  return (x: number, y: number, z: number) =>
    noise.noise3d(x * 0.85, y * 0.85, z * 0.85) * 0.72 + noise.noise3d(x * 2.1 + 7.1, y * 2.1, z * 2.1) * 0.28;
}

const TUNNEL_START = PTC.clone().add(new THREE.Vector3(0, 0.03, -0.04));
const TUNNEL_DIR = TUNNEL_END.clone().sub(TUNNEL_START);
const TUNNEL_LEN_SQ = TUNNEL_DIR.lengthSq();

// Regions removed from both subunits: the intersubunit cavity (left open toward the viewer as a
// cutaway so the A/P/E sites are visible), the mRNA channel and the exit tunnel with a front slot.
function isCarved(x: number, y: number, z: number): boolean {
  if (sdRoundBox(x + 0.38, y - 0.5, z - 1.3, 1.4, 0.95, 2.25, 0.3) < 0) return true;
  // front-right cutaway, so the default 3/4 camera sees into the A site and the tRNA L-shapes
  if (sdRoundBox(x - 1.6, y - 0.5, z - 1.95, 1.9, 0.95, 1.6, 0.3) < 0) return true;
  const gy = y - MRNA_Y, gz = z - MRNA_Z;
  if (gy * gy + gz * gz < 0.09) return true;

  const px = x - TUNNEL_START.x, py = y - TUNNEL_START.y, pz = z - TUNNEL_START.z;
  const t = (px * TUNNEL_DIR.x + py * TUNNEL_DIR.y + pz * TUNNEL_DIR.z) / TUNNEL_LEN_SQ;
  const tc = clamp(t, 0, 1);
  const cx = TUNNEL_START.x + TUNNEL_DIR.x * tc;
  const cy = TUNNEL_START.y + TUNNEL_DIR.y * tc;
  const cz = TUNNEL_START.z + TUNNEL_DIR.z * tc;
  if (len3(x - cx, y - cy, z - cz) < 0.34) return true;
  if (t > 0.02 && t < 1 && x - cx > -0.4 && x - cx < 0.9 && z > cz - 0.05) return true;
  return false;
}

const fbmLarge = makeFbm(11);
const fbmSmall = makeFbm(29);
const P_STALK_A = new THREE.Vector3(2.2, 1.7, -0.2);
const P_STALK_B = new THREE.Vector3(3.05, 2.55, 0.15);

function largeSdf(x: number, y: number, z: number): number {
  const body = sdEllipsoid(x, y - 1.6, z + 0.35, 2.7, 1.7, 2.05);
  const centralProtuberance = sdEllipsoid(x - 0.05, y - 3.05, z + 0.55, 0.85, 0.75, 0.8);
  const l1Stalk = sdEllipsoid(x + 2.55, y - 2.35, z + 0.1, 0.55, 0.95, 0.5);
  const pStalk = sdCapsule(x, y, z, P_STALK_A, P_STALK_B, 0.32);
  const d = smin(smin(smin(body, centralProtuberance, 0.6), l1Stalk, 0.5), pStalk, 0.4);
  return d - fbmLarge(x, y, z) * 0.22;
}

function smallSdf(x: number, y: number, z: number): number {
  const body = sdEllipsoid(x - 0.15, y + 1.4, z + 0.25, 2.45, 0.95, 1.8);
  const head = sdEllipsoid(x + 1.55, y + 0.85, z + 0.35, 0.95, 0.72, 1.0);
  const shoulder = sdEllipsoid(x - 1.75, y + 0.95, z + 0.3, 0.8, 0.55, 0.9);
  return smin(smin(body, head, 0.6), shoulder, 0.5) - fbmSmall(x, y, z) * 0.18;
}

const DIRS: [number, number, number][] = [];
for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
  if (dx !== 0 || dy !== 0 || dz !== 0) DIRS.push([dx, dy, dz]);
}

const OUTSIDE = 0;
const CARVED = 1;
const SOLID = 2;

interface SubunitSpec {
  sdf: (x: number, y: number, z: number) => number;
  min: [number, number, number];
  max: [number, number, number];
  seed: number;
  rna: string;
  protein: string;
  cut: string;
  proteinClusters: number;
}

// Space-filling "molecular surface": the shape is sampled once on an occupancy grid, then only
// cells near a surface become atoms (jittered), with ambient occlusion from grid lookups baked
// into each atom's color.
function buildSubunit(spec: SubunitSpec): AtomCloud {
  const rand = seededRandom(spec.seed);
  const step = 0.15;
  const jitter = 0.045;
  const nx = Math.ceil((spec.max[0] - spec.min[0]) / step) + 1;
  const ny = Math.ceil((spec.max[1] - spec.min[1]) / step) + 1;
  const nz = Math.ceil((spec.max[2] - spec.min[2]) / step) + 1;
  const grid = new Uint8Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (i * ny + j) * nz + k;
  const at = (i: number, j: number, k: number) =>
    i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? OUTSIDE : grid[idx(i, j, k)];

  for (let i = 0; i < nx; i++) {
    const x = spec.min[0] + i * step;
    for (let j = 0; j < ny; j++) {
      const y = spec.min[1] + j * step;
      for (let k = 0; k < nz; k++) {
        const z = spec.min[2] + k * step;
        if (spec.sdf(x, y, z) >= 0) continue;
        grid[idx(i, j, k)] = isCarved(x, y, z) ? CARVED : SOLID;
      }
    }
  }

  const kept: { x: number; y: number; z: number; cutOnly: boolean; occ: number }[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      for (let k = 0; k < nz; k++) {
        if (grid[idx(i, j, k)] !== SOLID) continue;

        let outer = false;
        let cut = false;
        for (const [dx, dy, dz] of DIRS) {
          const s = at(i + dx * 2, j + dy * 2, k + dz * 2);
          if (s === OUTSIDE) outer = true;
          else if (s === CARVED) cut = true;
        }
        if (!outer && !cut) continue;

        let occluded = 0;
        for (const [dx, dy, dz] of DIRS) {
          if (at(i + dx * 4, j + dy * 4, k + dz * 4) === SOLID) occluded++;
        }
        kept.push({
          x: spec.min[0] + i * step + (rand() - 0.5) * 2 * jitter,
          y: spec.min[1] + j * step + (rand() - 0.5) * 2 * jitter,
          z: spec.min[2] + k * step + (rand() - 0.5) * 2 * jitter,
          cutOnly: cut && !outer,
          occ: occluded / DIRS.length,
        });
      }
    }
  }

  const centers: { x: number; y: number; z: number; r: number }[] = [];
  for (let guard = 0; centers.length < spec.proteinClusters && guard < 5000; guard++) {
    const a = kept[Math.floor(rand() * kept.length)];
    if (a.cutOnly) continue;
    centers.push({ x: a.x, y: a.y, z: a.z, r: 0.28 + rand() * 0.3 });
  }

  const rna = new THREE.Color(spec.rna);
  const protein = new THREE.Color(spec.protein);
  const cutColor = new THREE.Color(spec.cut);
  const c = new THREE.Color();

  const count = kept.length;
  const positions = new Float32Array(count * 3);
  const radii = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  kept.forEach((a, i) => {
    const isProtein = centers.some((p) => len3(a.x - p.x, a.y - p.y, a.z - p.z) < p.r);
    c.copy(isProtein ? protein : rna);
    if (a.cutOnly) c.lerp(cutColor, 0.35);
    const occN = clamp((a.occ - 0.3) / 0.5, 0, 1);
    c.multiplyScalar((1.08 - 0.72 * occN) * (0.93 + rand() * 0.12));

    positions.set([a.x, a.y, a.z], i * 3);
    radii[i] = (isProtein ? 0.095 : 0.1) + rand() * 0.035;
    colors.set([c.r, c.g, c.b], i * 3);
  });

  return { count, positions, radii, colors };
}

function once<T>(build: () => T): () => T {
  let cached: T | undefined;
  return () => (cached ??= build());
}

export const buildLargeSubunit = once((): AtomCloud =>
  buildSubunit({
    sdf: largeSdf,
    min: [-3.4, -0.5, -2.8],
    max: [3.6, 4.2, 2.2],
    seed: 5,
    rna: '#177a8e',
    protein: '#4fb0bd',
    cut: '#a7dce2',
    proteinClusters: 30,
  }),
);

export const buildSmallSubunit = once((): AtomCloud =>
  buildSubunit({
    sdf: smallSdf,
    min: [-3.0, -2.6, -2.4],
    max: [3.0, 0.2, 1.9],
    seed: 9,
    rna: '#624a9e',
    protein: '#9b82d6',
    cut: '#cbbdf0',
    proteinClusters: 20,
  }),
);

// tRNA template in local coordinates (site at x = 0): anticodon loop at the bottom touching the
// mRNA, the anticodon arm rising to the elbow, and the acceptor arm reaching back to the PTC.
// `colors` holds a grey AO shade per atom, multiplied by the body color at assignment time.
export const buildTrnaTemplate = once((): AtomCloud => {
  const rand = seededRandom(77);
  const pts: THREE.Vector3[] = [];
  const radii: number[] = [];

  const curve = new THREE.CatmullRomCurve3(
    [
      [0, -0.2, 0.22], [0, 0.2, 0.2], [0, 0.62, 0.22], [0, 0.95, 0.32],
      [0, 1.08, 0.05], [0, 1.1, -0.3], [TRNA_CCA.x, TRNA_CCA.y, TRNA_CCA.z],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  );
  const rings = Math.round(curve.getLength() / 0.065);
  const side = new THREE.Vector3(1, 0, 0);
  const binormal = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const p = curve.getPointAt(t);
    binormal.crossVectors(curve.getTangentAt(t), side).normalize();
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2 + i * 0.45;
      const r = 0.1 * (0.85 + rand() * 0.3);
      pts.push(p.clone().addScaledVector(side, Math.cos(ang) * r * 1.1).addScaledVector(binormal, Math.sin(ang) * r));
      radii.push(0.062 + rand() * 0.016);
    }
  }

  const elbow = new THREE.Vector3(0, 0.97, 0.33);
  for (let i = 0; i < 38; i++) {
    const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    pts.push(elbow.clone().addScaledVector(dir, 0.1 + rand() * 0.1));
    radii.push(0.068 + rand() * 0.018);
  }

  for (let i = 0; i <= 8; i++) {
    const x = -0.24 + (i / 8) * 0.48;
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + i;
      pts.push(new THREE.Vector3(x, -0.2 + Math.sin(ang) * 0.08, 0.2 + Math.cos(ang) * 0.08));
      radii.push(0.065 + rand() * 0.015);
    }
  }

  const count = pts.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let neighbors = 0;
    for (let j = 0; j < count; j++) {
      if (i !== j && pts[i].distanceToSquared(pts[j]) < 0.26 * 0.26) neighbors++;
    }
    const shade = clamp(1.12 - neighbors * 0.035, 0.6, 1.05) * (0.94 + rand() * 0.1);
    positions.set([pts[i].x, pts[i].y, pts[i].z], i * 3);
    colors.set([shade, shade, shade], i * 3);
  }
  return { count, positions, radii: Float32Array.from(radii), colors };
});

// Path followed by the nascent chain, one point per residue: up the exit tunnel, then an
// alpha-helix in the vestibule, then a compact random coil standing in for early folding.
export function buildChainPath(residues: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const dir = TUNNEL_END.clone().sub(PTC);
  const tunnelLen = dir.length();
  dir.normalize();

  const inTunnel = Math.floor(tunnelLen / RESIDUE_SPACING);
  for (let d = 0; d <= inTunnel; d++) {
    const p = PTC.clone().addScaledVector(dir, d * RESIDUE_SPACING);
    p.x += 0.06 * Math.sin(d * 1.4);
    p.z += 0.04 * Math.cos(d * 1.1);
    pts.push(p);
  }

  // leans toward the default camera so the helix and coil stay in frame above the 60S
  const axis = new THREE.Vector3(0.85, 0.22, 0.5).normalize();
  const u = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u);
  const helixBase = TUNNEL_END.clone().addScaledVector(dir, 0.15);
  for (let m = 1; m <= 13; m++) {
    const r = 0.26 * Math.min(1, m / 3);
    const ang = m * 1.745;
    pts.push(
      helixBase.clone()
        .addScaledVector(axis, m * 0.16)
        .addScaledVector(u, Math.cos(ang) * r)
        .addScaledVector(v, Math.sin(ang) * r),
    );
  }

  const rand = seededRandom(2024);
  let prev = pts[pts.length - 1].clone();
  const heading = axis.clone();
  const center = prev.clone().addScaledVector(axis, 1.0).add(new THREE.Vector3(0.2, -0.15, 0.4));
  const jitterDir = new THREE.Vector3();
  const toCenter = new THREE.Vector3();
  while (pts.length < residues + 2) {
    toCenter.subVectors(center, prev);
    const pull = (0.25 + Math.min(1, pts.length / 60) * 0.5) * Math.min(2, toCenter.length() / 1.5);
    jitterDir.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    heading.multiplyScalar(0.6).addScaledVector(jitterDir, 0.8).addScaledVector(toCenter.normalize(), pull).normalize();
    prev = prev.clone().addScaledVector(heading, RESIDUE_SPACING);
    pts.push(prev);
  }
  return pts;
}

// mRNA backbone: straight inside the ribosome channel, gently undulating outside it.
export function mrnaCurve(x: number, time: number, out: THREE.Vector3): THREE.Vector3 {
  const b = smoothstep(FLAT_HALF_WIDTH, FLAT_HALF_WIDTH + 1.4, Math.abs(x));
  const y = MRNA_Y + b * (0.42 * Math.sin(x * 0.85 + time * 0.55) - 0.25 * b);
  const z = MRNA_Z + b * 0.55 * Math.sin(x * 0.55 + 1.2 + time * 0.4);
  return out.set(x, y, z);
}

export function mrnaFlexibility(x: number): number {
  return smoothstep(FLAT_HALF_WIDTH, FLAT_HALF_WIDTH + 1.4, Math.abs(x));
}
