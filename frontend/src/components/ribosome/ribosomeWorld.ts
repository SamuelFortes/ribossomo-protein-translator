import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { CodonDetail } from '../../types';
import {
  CODON_WIDTH,
  MRNA_Y,
  MRNA_Z,
  NT_SPACING,
  PTC,
  SITE_X,
  SMALL_PIVOT,
  TRNA_CCA,
  buildChainPath,
  buildLargeSubunit,
  buildSmallSubunit,
  buildTrnaTemplate,
  mrnaCurve,
  mrnaFlexibility,
  type AtomCloud,
} from './ribosomeGeometry';

export type SceneThemeName = 'dark' | 'light';

export interface RibosomeWorld {
  setTheme(theme: SceneThemeName): void;
  setCodons(codons: CodonDetail[]): void;
  setStep(step: number): void;
  dispose(): void;
}

const NT_COLORS: Record<string, string> = { A: '#10b981', U: '#f43f5e', G: '#f59e0b', C: '#06b6d4' };
const COMPLEMENT: Record<string, string> = { A: 'U', U: 'A', G: 'C', C: 'G' };
const FLANK_5 = 9;
const FLANK_3 = 14;
const TRNA_BODY = '#e8c38a';
const RELEASE_FACTOR = '#f5c542';
const SITE_COLORS = { A: '#f43f5e', P: '#22d3ee', E: '#94a3b8' } as const;
const POOL_SIZE = 6;
const ARRIVE_FROM = new THREE.Vector3(1.1, 2.0, 3.2);
const DEPART_TO = new THREE.Vector3(-1.6, 1.8, 3.0);
const RELEASE_TO = new THREE.Vector3(1.4, 3.2, 1.8);

const PALETTES = {
  dark: {
    bgInner: '#12264a',
    bgOuter: '#020617',
    fog: 0x050d1f,
    fogDensity: 0.026,
    particles: 0x7dd3fc,
    particleOpacity: 0.4,
    additiveParticles: true,
    hemiSky: 0xbfdbfe,
    hemiGround: 0x1e1b4b,
    hemi: 0.65,
    key: 1.7,
    exposure: 1.0,
    bloom: true,
    env: 0.35,
  },
  light: {
    bgInner: '#ffffff',
    bgOuter: '#cbd5e1',
    fog: 0xe2e8f0,
    fogDensity: 0.018,
    particles: 0x64748b,
    particleOpacity: 0.28,
    additiveParticles: false,
    hemiSky: 0xffffff,
    hemiGround: 0x94a3b8,
    hemi: 0.95,
    key: 2.0,
    exposure: 0.95,
    bloom: false,
    env: 0.55,
  },
} as const;

type Palette = (typeof PALETTES)[SceneThemeName];

interface Label {
  object: CSS2DObject;
  set(title: string, subtitle?: string, dotColor?: string): void;
  setOpacity(opacity: number): void;
}

// HTML labels keep a fixed pixel size at any zoom and follow the app theme through Tailwind's
// `dark:` variants, so they need no redraw on theme change.
function makeLabel(): Label {
  const el = document.createElement('div');
  el.className =
    'pointer-events-none select-none whitespace-nowrap rounded-md border border-slate-300/70 bg-white/85 px-1.5 py-0.5 leading-tight shadow-sm backdrop-blur-sm dark:border-slate-600/50 dark:bg-slate-950/75';
  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-1 text-[11px] font-semibold text-slate-900 dark:text-slate-100';
  const dot = document.createElement('span');
  dot.className = 'inline-block h-1.5 w-1.5 shrink-0 rounded-full';
  const title = document.createElement('span');
  titleRow.append(dot, title);
  const subtitle = document.createElement('div');
  subtitle.className = 'text-[9px] text-slate-500 dark:text-slate-400';
  el.append(titleRow, subtitle);
  return {
    object: new CSS2DObject(el),
    set(text, sub, dotColor) {
      title.textContent = text;
      subtitle.textContent = sub ?? '';
      subtitle.style.display = sub ? '' : 'none';
      dot.style.display = dotColor ? '' : 'none';
      dot.style.backgroundColor = dotColor ?? '';
    },
    setOpacity(opacity) {
      el.style.opacity = opacity.toFixed(2);
    },
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t * t * t;

export function createRibosomeWorld(container: HTMLElement, initialTheme: SceneThemeName): RibosomeWorld {
  let palette: Palette = PALETTES[initialTheme];
  const width = () => Math.max(1, container.clientWidth);
  const height = () => Math.max(1, container.clientHeight);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(width(), height());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = palette.exposure;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width(), height());
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  container.style.position = 'relative';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width() / height(), 0.1, 120);
  camera.position.set(8.0, 4.4, 10.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 5;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.target.set(0.6, 1.55, 0);
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, palette.key);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x93c5fd, 1.3);
  rim.position.set(-6, 3, -7);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfde68a, 0.35);
  fill.position.set(0, -4, 6);
  scene.add(fill);
  const ptcLight = new THREE.PointLight(0xfef3c7, 0, 4, 1.5);
  ptcLight.position.copy(PTC);
  scene.add(ptcLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.4, 0.5, 0.96);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- shared resources ----------
  const disposables: { dispose(): void }[] = [pmrem, envTexture];
  const atomGeo = new THREE.IcosahedronGeometry(1, 1);
  const beadGeo = new THREE.IcosahedronGeometry(1, 2);
  const linkGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const baseGeo = new THREE.CapsuleGeometry(0.055, 0.13, 3, 8);
  const atomMat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
  const trnaMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
  const nucleotideMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 });
  const backboneMat = new THREE.MeshStandardMaterial({ color: 0x9aa7bd, roughness: 0.45, metalness: 0.1 });
  const residueMat = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const bondMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 });
  disposables.push(atomGeo, beadGeo, linkGeo, baseGeo, atomMat, trnaMat, nucleotideMat, backboneMat, residueMat, bondMat);

  const glowTexture = makeGlowTexture();
  disposables.push(glowTexture);

  const tmpMatrix = new THREE.Matrix4();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);
  const WHITE = new THREE.Color('#ffffff');

  function cloudMesh(cloud: AtomCloud, material: THREE.Material): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(atomGeo, material, cloud.count);
    tmpQuat.identity();
    for (let i = 0; i < cloud.count; i++) {
      tmpPos.fromArray(cloud.positions, i * 3);
      const r = cloud.radii[i];
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale.set(r, r, r));
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, tmpColor.fromArray(cloud.colors, i * 3));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  // ---------- background, fog and ambient particles ----------
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = bgCanvas.height = 512;
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  disposables.push(bgTexture);
  scene.background = bgTexture;
  scene.fog = new THREE.FogExp2(palette.fog, palette.fogDensity);

  const particleCount = 420;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions.set(
      [(Math.random() - 0.5) * 28, (Math.random() - 0.5) * 17 + 0.5, (Math.random() - 0.5) * 18 - 3],
      i * 3,
    );
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.11,
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  disposables.push(particleGeo, particleMat);

  // ---------- ribosome ----------
  const ribosome = new THREE.Group();
  scene.add(ribosome);
  const largeSubunit = cloudMesh(buildLargeSubunit(), atomMat);
  ribosome.add(largeSubunit);
  const smallPivot = new THREE.Group();
  smallPivot.position.copy(SMALL_PIVOT);
  const smallSubunit = cloudMesh(buildSmallSubunit(), atomMat);
  smallSubunit.position.copy(SMALL_PIVOT).multiplyScalar(-1);
  smallPivot.add(smallSubunit);
  ribosome.add(smallPivot);

  // ---------- labels ----------
  for (const site of ['E', 'P', 'A'] as const) {
    const chip = document.createElement('div');
    chip.className =
      'pointer-events-none flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-slate-950 shadow ring-1 ring-black/20';
    chip.style.backgroundColor = SITE_COLORS[site];
    chip.textContent = site;
    chip.title = { E: 'Sítio E (saída)', P: 'Sítio P (peptidil)', A: 'Sítio A (aminoacil)' }[site];
    const object = new CSS2DObject(chip);
    object.position.set(SITE_X[site], -1.0, 1.55);
    scene.add(object);
  }
  const staticLabels: [string, string | undefined, THREE.Vector3][] = [
    ['Subunidade 60S', undefined, new THREE.Vector3(-3.4, 1.9, 0.3)],
    ['Subunidade 40S', undefined, new THREE.Vector3(3.0, -1.4, 1.4)],
    ["5'", undefined, new THREE.Vector3(-6.2, MRNA_Y - 0.3, MRNA_Z)],
    ["3'", undefined, new THREE.Vector3(6.2, MRNA_Y - 0.3, MRNA_Z)],
  ];
  for (const [text, sub, pos] of staticLabels) {
    const label = makeLabel();
    label.set(text, sub);
    label.object.position.copy(pos);
    scene.add(label.object);
  }

  // ---------- glows ----------
  function makeGlow(color: string, size: number): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(size);
    return sprite;
  }
  const codonHalo = makeGlow(SITE_COLORS.A, 1.3);
  scene.add(codonHalo);
  const ptcFlash = makeGlow('#fff7d6', 1.2);
  ptcFlash.position.copy(PTC);
  scene.add(ptcFlash);

  // ---------- tRNA / release-factor pool ----------
  const trnaTemplate = buildTrnaTemplate();
  interface Slot {
    group: THREE.Group;
    body: THREE.InstancedMesh;
    anticodon: THREE.InstancedMesh;
    aa: THREE.Mesh;
    aaMat: THREE.MeshStandardMaterial;
    label: Label;
    codonIndex: number;
    isReleaseFactor: boolean;
  }
  const slots: Slot[] = [];
  for (let s = 0; s < POOL_SIZE; s++) {
    const group = new THREE.Group();
    const body = cloudMesh(trnaTemplate, trnaMat);
    group.add(body);
    const anticodon = new THREE.InstancedMesh(baseGeo, nucleotideMat, 3);
    for (let n = 0; n < 3; n++) {
      tmpMatrix.compose(tmpPos.set((n - 1) * NT_SPACING, -0.3, MRNA_Z), tmpQuat.identity(), tmpScale.set(1, 1, 1));
      anticodon.setMatrixAt(n, tmpMatrix);
      anticodon.setColorAt(n, tmpColor.set('#ffffff'));
    }
    anticodon.computeBoundingSphere();
    group.add(anticodon);
    const aaMat = new THREE.MeshStandardMaterial({ roughness: 0.35, emissiveIntensity: 0.35 });
    const aa = new THREE.Mesh(beadGeo, aaMat);
    aa.position.copy(TRNA_CCA).add(tmpA.set(0, 0.12, -0.1));
    aa.scale.setScalar(0.17);
    group.add(aa);
    const label = makeLabel();
    label.object.position.set(1.2, 0.35, 0.6);
    group.add(label.object);
    group.visible = false;
    scene.add(group);
    disposables.push(aaMat);
    slots.push({ group, body, anticodon, aa, aaMat, label, codonIndex: -1, isReleaseFactor: false });
  }

  const ptcBond = new THREE.Mesh(linkGeo, bondMat);
  ptcBond.visible = false;
  scene.add(ptcBond);

  // ---------- dynamic state ----------
  let codons: CodonDetail[] = [];
  let residueCount = 0;
  let stopIndex = -1;
  let chainPath: THREE.Vector3[] = [];
  let ntSeq: string[] = [];
  let backbone: THREE.InstancedMesh | null = null;
  let links: THREE.InstancedMesh | null = null;
  let bases: THREE.InstancedMesh | null = null;
  let residues: THREE.InstancedMesh | null = null;
  let bonds: THREE.InstancedMesh | null = null;

  let target = 0;
  let anim = 0;
  let release = 0;
  let flash = 0;
  let ratchet = 0;
  let time = 0;

  function replaceMesh(old: THREE.InstancedMesh | null, next: THREE.InstancedMesh): THREE.InstancedMesh {
    if (old) {
      scene.remove(old);
      old.dispose();
    }
    next.frustumCulled = false;
    next.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(next);
    return next;
  }

  function codonX(i: number): number {
    return (i - Math.max(anim, 1)) * CODON_WIDTH + SITE_X.A;
  }

  function assignSlot(slot: Slot, index: number) {
    const codon = codons[index];
    slot.codonIndex = index;
    slot.isReleaseFactor = codon.type === 'stop';
    const bodyColor = new THREE.Color(slot.isReleaseFactor ? RELEASE_FACTOR : TRNA_BODY);
    for (let i = 0; i < trnaTemplate.count; i++) {
      tmpColor.copy(bodyColor).multiplyScalar(trnaTemplate.colors[i * 3]);
      slot.body.setColorAt(i, tmpColor);
    }
    slot.body.instanceColor!.needsUpdate = true;
    slot.anticodon.visible = !slot.isReleaseFactor;
    slot.aa.visible = !slot.isReleaseFactor;

    if (slot.isReleaseFactor) {
      slot.label.set('eRF1', 'fator de liberação', RELEASE_FACTOR);
      return;
    }
    const anti = codon.codon.split('').map((n) => COMPLEMENT[n] ?? n);
    anti.forEach((n, i) => slot.anticodon.setColorAt(i, tmpColor.set(NT_COLORS[n] ?? '#94a3b8')));
    slot.anticodon.instanceColor!.needsUpdate = true;
    slot.aaMat.color.set(codon.color);
    slot.aaMat.emissive.set(codon.color);
    slot.label.set(`tRNA-${codon.aminoAcid}`, `anticódon ${anti.join('')}`, codon.color);
  }

  function refreshBaseColors() {
    if (!bases) return;
    const active = Math.round(target);
    for (let g = 0; g < ntSeq.length; g++) {
      const nt = ntSeq[g];
      tmpColor.set(nt === 'N' ? '#64748b' : NT_COLORS[nt] ?? '#94a3b8');
      const codonIdx = Math.floor((g - FLANK_5) / 3);
      if (g >= FLANK_5 && codonIdx === active) tmpColor.lerp(WHITE, 0.35);
      bases.setColorAt(g, tmpColor);
    }
    bases.instanceColor!.needsUpdate = true;
  }

  function setCodons(next: CodonDetail[]) {
    codons = next;
    stopIndex = codons.findIndex((c) => c.type === 'stop');
    residueCount = stopIndex >= 0 ? stopIndex : codons.length;
    chainPath = buildChainPath(residueCount);

    ntSeq = [
      ...Array<string>(FLANK_5).fill('N'),
      ...codons.flatMap((c) => c.codon.split('')),
      ...Array<string>(FLANK_3).fill('A'),
    ];
    const n = ntSeq.length;
    backbone = replaceMesh(backbone, new THREE.InstancedMesh(atomGeo, backboneMat, n));
    links = replaceMesh(links, new THREE.InstancedMesh(linkGeo, backboneMat, n));
    bases = replaceMesh(bases, new THREE.InstancedMesh(baseGeo, nucleotideMat, n));
    for (let g = 0; g < n; g++) bases.setColorAt(g, tmpColor.set('#ffffff'));

    const cap = Math.max(1, residueCount);
    residues = replaceMesh(residues, new THREE.InstancedMesh(beadGeo, residueMat, cap));
    bonds = replaceMesh(bonds, new THREE.InstancedMesh(linkGeo, bondMat, cap));
    for (let j = 0; j < cap; j++) residues.setColorAt(j, tmpColor.set(codons[j]?.color ?? '#94a3b8'));
    residues.instanceColor!.needsUpdate = true;

    for (const slot of slots) slot.codonIndex = -1;
    anim = -0.9;
    release = 0;
    refreshBaseColors();
  }

  function setStep(step: number) {
    const prev = target;
    target = step;
    if (step !== prev) ratchet = 1;
    if (step > prev && codons[step]?.type === 'sense') flash = 1;
    refreshBaseColors();
  }

  // ---------- per-frame updates ----------
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  function placeLink(mesh: THREE.InstancedMesh, index: number, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    tmpB.subVectors(b, a);
    const len = tmpB.length();
    if (len < 1e-5) {
      mesh.setMatrixAt(index, hidden);
      return;
    }
    tmpQuat.setFromUnitVectors(UP, tmpB.multiplyScalar(1 / len));
    tmpPos.addVectors(a, b).multiplyScalar(0.5);
    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale.set(radius, len, radius));
    mesh.setMatrixAt(index, tmpMatrix);
  }

  const curBackbone = new THREE.Vector3();
  const prevBackbone = new THREE.Vector3();
  const baseCenter = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const baseDir = new THREE.Vector3();

  function updateMrna() {
    if (!backbone || !links || !bases) return;
    const shift = Math.max(anim, 1);
    for (let g = 0; g < ntSeq.length; g++) {
      const x = (g - FLANK_5 - 3 * shift - 1) * NT_SPACING + SITE_X.A;
      if (Math.abs(x) > 9.5) {
        backbone.setMatrixAt(g, hidden);
        links.setMatrixAt(g, hidden);
        bases.setMatrixAt(g, hidden);
        continue;
      }
      mrnaCurve(x, time, curBackbone);
      mrnaCurve(x + 0.02, time, tangent).sub(curBackbone).normalize();
      baseDir.copy(UP).applyAxisAngle(tangent, mrnaFlexibility(x) * Math.sin(g * 1.1 + time * 0.8) * 0.9);

      tmpMatrix.compose(curBackbone, tmpQuat.identity(), tmpScale.setScalar(0.085));
      backbone.setMatrixAt(g, tmpMatrix);

      if (g > 0) placeLink(links, g, mrnaCurve(x - NT_SPACING, time, prevBackbone), curBackbone, 0.04);
      else links.setMatrixAt(g, hidden);

      baseCenter.copy(curBackbone).addScaledVector(baseDir, 0.13);
      tmpQuat.setFromUnitVectors(UP, baseDir);
      tmpMatrix.compose(baseCenter, tmpQuat, tmpScale.set(1, 1, 1));
      bases.setMatrixAt(g, tmpMatrix);
    }
    backbone.instanceMatrix.needsUpdate = true;
    links.instanceMatrix.needsUpdate = true;
    bases.instanceMatrix.needsUpdate = true;
  }

  function chainPoint(d: number, out: THREE.Vector3): THREE.Vector3 {
    const i = Math.min(chainPath.length - 2, Math.floor(d));
    return out.lerpVectors(chainPath[i], chainPath[i + 1], Math.min(1, d - i));
  }

  const releaseOffset = new THREE.Vector3();
  const residuePos: THREE.Vector3[] = [];

  function updateChain() {
    if (!residues || !bonds) return;
    const r = easeInCubic(release);
    releaseOffset.copy(RELEASE_TO).multiplyScalar(r * 1.6);
    for (let j = 0; j < residueCount; j++) {
      const grow = clamp01((anim - j + 0.35) / 0.35);
      if (!residuePos[j]) residuePos[j] = new THREE.Vector3();
      if (grow <= 0) {
        residues.setMatrixAt(j, hidden);
        bonds.setMatrixAt(j, hidden);
        continue;
      }
      chainPoint(Math.max(0, anim - j), residuePos[j]).add(releaseOffset);
      tmpMatrix.compose(residuePos[j], tmpQuat.identity(), tmpScale.setScalar(0.15 * easeOutCubic(grow)));
      residues.setMatrixAt(j, tmpMatrix);
      if (j > 0 && clamp01((anim - (j - 1) + 0.35) / 0.35) > 0) placeLink(bonds, j, residuePos[j - 1], residuePos[j], 0.045);
      else bonds.setMatrixAt(j, hidden);
    }
    residues.instanceMatrix.needsUpdate = true;
    bonds.instanceMatrix.needsUpdate = true;
  }

  function updateSlots() {
    const used = new Set<number>();
    const iMin = Math.max(0, Math.floor(anim - 3) + 1);
    const iMax = Math.min(codons.length - 1, Math.ceil(anim + 1) - 1);
    for (let i = iMin; i <= iMax; i++) {
      const slot = slots[i % POOL_SIZE];
      used.add(i % POOL_SIZE);
      if (slot.codonIndex !== i) assignSlot(slot, i);

      const arrive = easeOutCubic(clamp01(anim - i + 1));
      const depart = easeInCubic(clamp01(anim - i - 2));
      tmpA.copy(ARRIVE_FROM).multiplyScalar(1 - arrive).addScaledVector(DEPART_TO, depart);
      slot.group.position.set(codonX(i) + tmpA.x, tmpA.y, tmpA.z);
      slot.group.rotation.set((1 - arrive) * -0.25, 0, (1 - arrive) * -0.45 + depart * 0.55);
      slot.group.scale.setScalar((0.6 + 0.4 * arrive) * (1 - 0.9 * depart));
      slot.group.visible = true;

      const inChain = clamp01((anim - i + 0.35) / 0.35);
      slot.aa.visible = !slot.isReleaseFactor && inChain < 1;
      slot.aa.scale.setScalar(0.17 * (1 - inChain));
      slot.label.setOpacity(i === Math.round(target) ? arrive * (1 - depart) : 0);
    }
    slots.forEach((slot, s) => {
      if (!used.has(s)) slot.group.visible = false;
    });

    const head = Math.min(residueCount - 1, Math.floor(anim + 1e-6));
    const holder = head >= 0 ? slots[head % POOL_SIZE] : undefined;
    if (holder && holder.codonIndex === head && release < 0.05 && residuePos[head] && anim >= head) {
      holder.group.updateMatrixWorld();
      tmpA.copy(TRNA_CCA).applyMatrix4(holder.group.matrixWorld);
      tmpB.copy(residuePos[head]);
      tmpB.sub(tmpA);
      const len = tmpB.length();
      ptcBond.visible = len > 0.01;
      ptcBond.position.addVectors(tmpA, residuePos[head]).multiplyScalar(0.5);
      ptcBond.quaternion.setFromUnitVectors(UP, tmpB.normalize());
      ptcBond.scale.set(0.045, len, 0.045);
    } else {
      ptcBond.visible = false;
    }
  }

  function updateHighlights(dt: number) {
    const active = Math.round(target);
    const codon = codons[active];
    const siteX = active === 0 ? SITE_X.P : SITE_X.A;
    const haloColor = codon?.type === 'stop' ? RELEASE_FACTOR : active === 0 ? SITE_COLORS.P : SITE_COLORS.A;
    const haloMat = codonHalo.material as THREE.SpriteMaterial;
    haloMat.color.set(haloColor);
    haloMat.opacity = codon ? 0.42 + 0.18 * Math.sin(time * 3) : 0;
    codonHalo.position.set(siteX, MRNA_Y + 0.05, MRNA_Z + 0.15);

    flash = Math.max(0, flash - dt * 1.4);
    const flashMat = ptcFlash.material as THREE.SpriteMaterial;
    flashMat.opacity = flash;
    ptcFlash.scale.setScalar(0.5 + 1.6 * easeOutCubic(1 - flash) * (flash > 0 ? 1 : 0));
    ptcLight.intensity = flash * 7;

    ratchet = Math.max(0, ratchet - dt * 1.8);
    smallPivot.rotation.y = Math.sin((1 - ratchet) * Math.PI) * 0.045 * (ratchet > 0 ? 1 : 0);

    const releaseTarget = stopIndex >= 0 && target === stopIndex && anim > stopIndex - 0.15 ? 1 : 0;
    release += (releaseTarget - release) * Math.min(1, dt * 0.7);
  }

  // ---------- theme ----------
  function applyTheme(next: SceneThemeName) {
    palette = PALETTES[next];
    const ctx = bgCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 210, 20, 256, 256, 380);
    grad.addColorStop(0, palette.bgInner);
    grad.addColorStop(1, palette.bgOuter);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    bgTexture.needsUpdate = true;

    const fog = scene.fog as THREE.FogExp2;
    fog.color.setHex(palette.fog);
    fog.density = palette.fogDensity;
    hemi.color.setHex(palette.hemiSky);
    hemi.groundColor.setHex(palette.hemiGround);
    hemi.intensity = palette.hemi;
    key.intensity = palette.key;
    renderer.toneMappingExposure = palette.exposure;
    scene.environmentIntensity = palette.env;
    bloom.enabled = palette.bloom;
    particleMat.color.setHex(palette.particles);
    particleMat.opacity = palette.particleOpacity;
    particleMat.blending = palette.additiveParticles ? THREE.AdditiveBlending : THREE.NormalBlending;
    particleMat.needsUpdate = true;
  }
  applyTheme(initialTheme);

  // ---------- loop ----------
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    anim += (target - anim) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(target - anim) < 1e-4) anim = target;

    ribosome.position.y = Math.sin(time * 0.6) * 0.03;
    particles.rotation.y += dt * 0.012;
    particles.position.y = Math.sin(time * 0.25) * 0.15;

    if (codons.length > 0) {
      updateHighlights(dt);
      updateMrna();
      updateChain();
      updateSlots();
    }
    controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  const resizeObserver = new ResizeObserver(() => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
    composer.setSize(width(), height());
    labelRenderer.setSize(width(), height());
  });
  resizeObserver.observe(container);

  return {
    setTheme: applyTheme,
    setCodons,
    setStep,
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.dispose();
      for (const mesh of [largeSubunit, smallSubunit, backbone, links, bases, residues, bonds]) mesh?.dispose();
      for (const slot of slots) {
        slot.body.dispose();
        slot.anticodon.dispose();
      }
      for (const d of disposables) d.dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
