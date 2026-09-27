import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // localStorage indisponível (modo privado, cookies bloqueados) — tema
    // ainda funciona, só não persiste entre sessões.
  }
}

const listeners = new Set<() => void>();
let currentTheme: Theme = readTheme();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentTheme;
}

function setTheme(theme: Theme) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(theme);
  listeners.forEach((l) => l());
}

/**
 * Fonte única de verdade para o tema atual, compartilhada entre TODAS as
 * chamadas de useTheme() via um pequeno external store (useSyncExternalStore).
 * O <html> já chega com a classe "dark" aplicada (ou não) pelo script inline
 * em index.html, que decide entre localStorage e prefers-color-scheme antes
 * do React montar (evita flash). Qualquer componente que chame este hook —
 * Header, RibosomeScene, etc. — reage à mesma troca de tema, não só quem a
 * disparou (bug anterior: cada chamada tinha seu próprio useState isolado).
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
