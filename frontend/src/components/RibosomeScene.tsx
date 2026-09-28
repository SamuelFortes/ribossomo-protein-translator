import { useEffect, useRef } from 'react';
import type { CodonDetail } from '../types';
import { useTheme } from './useTheme';
import { createRibosomeWorld, type RibosomeWorld } from './ribosome/ribosomeWorld';

interface RibosomeSceneProps {
  codons: CodonDetail[];
  currentStep: number;
}

export default function RibosomeScene({ codons, currentStep }: RibosomeSceneProps) {
  const { theme } = useTheme();
  const mountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<RibosomeWorld | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const world = createRibosomeWorld(mount, document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    worldRef.current = world;
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    worldRef.current?.setCodons(codons);
  }, [codons]);

  useEffect(() => {
    worldRef.current?.setStep(currentStep);
  }, [currentStep]);

  return <div ref={mountRef} className="h-full w-full" />;
}
