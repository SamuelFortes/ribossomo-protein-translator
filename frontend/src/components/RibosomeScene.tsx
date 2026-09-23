import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CodonDetail } from '../types';

interface RibosomeSceneProps {
  codons: CodonDetail[];
  currentStep: number;
}

const NT_COLORS: Record<string, number> = {
  A: 0x10b981,
  U: 0xf43f5e,
  G: 0xf59e0b,
  C: 0x06b6d4,
};

export default function RibosomeScene({ codons, currentStep }: RibosomeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    mrnaGroup: THREE.Group;
    peptideGroup: THREE.Group;
    siteAMarker: THREE.Group;
    sitePMarker: THREE.Group;
    tRnaA: THREE.Group;
    tRnaP: THREE.Group;
    frameId: number;
  } | null>(null);

  // Setup scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 12, 30);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 2.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);

    // Lighting — biotech glow palette
    scene.add(new THREE.AmbientLight(0x334155, 1.2));
    const key = new THREE.PointLight(0x22d3ee, 2.2, 25);
    key.position.set(5, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xa855f7, 1.8, 25);
    rim.position.set(-6, -3, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0x10b981, 1, 20);
    fill.position.set(0, -5, 4);
    scene.add(fill);

    // --- Large subunit (60S) ---
    const largeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e7490,
      roughness: 0.35,
      metalness: 0.1,
      transmission: 0.15,
      thickness: 1,
      clearcoat: 0.4,
      emissive: 0x083344,
      emissiveIntensity: 0.3,
    });
    const largeSubunit = new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 48), largeMat);
    largeSubunit.scale.set(1, 0.85, 1);
    largeSubunit.position.y = 1.1;
    scene.add(largeSubunit);

    // Exit tunnel (carve visual via a darker cylinder)
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 2.4, 24), tunnelMat);
    tunnel.position.set(0, 1.6, 0.3);
    tunnel.rotation.x = Math.PI / 2.4;
    scene.add(tunnel);

    // --- Small subunit (40S) ---
    const smallMat = new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      emissive: 0x2e1065,
      emissiveIntensity: 0.3,
    });
    const smallSubunit = new THREE.Mesh(new THREE.SphereGeometry(1.7, 48, 48), smallMat);
    smallSubunit.scale.set(1.15, 0.55, 1);
    smallSubunit.position.y = -1.05;
    scene.add(smallSubunit);

    // mRNA cleft groove indicator
    const cleftMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      emissive: 0x0f172a,
    });
    const cleft = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.12, 12, 48, Math.PI), cleftMat);
    cleft.rotation.x = Math.PI / 2;
    cleft.position.y = -0.2;
    scene.add(cleft);

    // --- Site markers (A, P, E) ---
    function makeSiteMarker(color: number, label: string, x: number) {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.035, 12, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.font = 'bold 90px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 64, 68);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.scale.set(0.6, 0.6, 0.6);
      sprite.position.y = 0.7;
      group.add(sprite);

      group.position.set(x, -0.15, 1.55);
      scene.add(group);
      return group;
    }

    const siteAMarker = makeSiteMarker(0xf43f5e, 'A', 1.1);
    const sitePMarker = makeSiteMarker(0x22d3ee, 'P', 0);
    makeSiteMarker(0x94a3b8, 'E', -1.1);

    // --- mRNA strand (built/updated dynamically) ---
    const mrnaGroup = new THREE.Group();
    scene.add(mrnaGroup);

    // --- Growing polypeptide chain ---
    const peptideGroup = new THREE.Group();
    peptideGroup.position.set(0, 3.0, 0.3);
    scene.add(peptideGroup);

    // --- tRNAs (simple stylized shapes) ---
    function makeTRna(color: number): THREE.Group {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.65, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.5 }),
      );
      body.rotation.x = Math.PI;
      g.add(body);
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.5 }),
      );
      bead.position.y = 0.45;
      g.add(bead);
      g.visible = false;
      return g;
    }
    const tRnaA = makeTRna(0xf43f5e);
    const tRnaP = makeTRna(0x22d3ee);
    tRnaA.position.set(1.1, 0.55, 1.55);
    tRnaP.position.set(0, 0.55, 1.55);
    scene.add(tRnaA);
    scene.add(tRnaP);

    stateRef.current = {
      scene,
      camera,
      renderer,
      controls,
      mrnaGroup,
      peptideGroup,
      siteAMarker,
      sitePMarker,
      tRnaA,
      tRnaP,
      frameId: 0,
    };

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      largeSubunit.rotation.y += 0.0006;
      smallSubunit.rotation.y += 0.0006;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  // Rebuild mRNA strand + peptide chain whenever codons/step change
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { mrnaGroup, peptideGroup, tRnaA, tRnaP } = state;

    // Clear previous
    mrnaGroup.clear();
    peptideGroup.clear();

    if (codons.length === 0) {
      tRnaA.visible = false;
      tRnaP.visible = false;
      return;
    }

    // Build mRNA as a chain of nucleotide beads flowing left-to-right through the cleft
    const windowSize = 9; // codons visible around current step
    const half = Math.floor(windowSize / 2);
    const startIdx = Math.max(0, Math.min(currentStep - half, codons.length - windowSize));
    const visibleCodons = codons.slice(Math.max(0, startIdx), startIdx + windowSize);

    visibleCodons.forEach((codon, ci) => {
      const globalIdx = startIdx + ci;
      const codonOffset = (ci - half) * 0.75;

      for (let ni = 0; ni < codon.codon.length; ni++) {
        const nt = codon.codon[ni];
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 14, 14),
          new THREE.MeshStandardMaterial({
            color: NT_COLORS[nt] ?? 0x64748b,
            emissive: NT_COLORS[nt] ?? 0x64748b,
            emissiveIntensity: globalIdx === currentStep ? 0.9 : 0.15,
          }),
        );
        bead.position.set(codonOffset + (ni - 1) * 0.22, -0.15, 1.55);
        bead.scale.setScalar(globalIdx === currentStep ? 1.3 : 1);
        mrnaGroup.add(bead);
      }

      // Backbone connector
      if (ci < visibleCodons.length - 1) {
        const connector = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x475569 }),
        );
        connector.rotation.z = Math.PI / 2;
        connector.position.set(codonOffset + 0.5, -0.15, 1.55);
        mrnaGroup.add(connector);
      }
    });

    // Position tRNAs relative to current codon (Site A = current, Site P = previous)
    const currentInWindow = currentStep - startIdx;
    if (currentInWindow >= 0 && currentInWindow < visibleCodons.length && codons[currentStep]) {
      tRnaA.visible = true;
      tRnaA.position.x = (currentInWindow - half) * 0.75;
    } else {
      tRnaA.visible = false;
    }
    if (currentStep > 0 && codons[currentStep - 1]) {
      const prevInWindow = currentStep - 1 - startIdx;
      tRnaP.visible = prevInWindow >= 0 && prevInWindow < visibleCodons.length;
      tRnaP.position.x = (prevInWindow - half) * 0.75;
    } else {
      tRnaP.visible = false;
    }

    // Growing polypeptide chain: one bead per translated amino acid up to currentStep
    const translated = codons.slice(0, Math.max(0, currentStep + 1)).filter((c) => c.type !== 'stop');
    translated.forEach((c, i) => {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(c.color),
          emissive: new THREE.Color(c.color),
          emissiveIntensity: 0.35,
          roughness: 0.4,
        }),
      );
      bead.position.set(0, -i * 0.42, 0);
      peptideGroup.add(bead);

      if (i > 0) {
        const bond = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
        );
        bond.position.set(0, -i * 0.42 + 0.21, 0);
        peptideGroup.add(bond);
      }
    });
  }, [codons, currentStep]);

  return <div ref={mountRef} className="h-full w-full" />;
}
