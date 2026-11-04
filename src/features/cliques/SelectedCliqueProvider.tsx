import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useMyCliques, type Clique } from './api';

const STORAGE_KEY = 'selected-clique';

type SelectedClique = { clique: Clique | null; select: (cliqueId: string) => void };

const SelectedCliqueContext = createContext<SelectedClique>({ clique: null, select: () => {} });

/** The clique Today and Clique show. Remembered on the device; falls back to the first clique. */
export function SelectedCliqueProvider({ children }: { children: ReactNode }) {
  const { cliques } = useMyCliques();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then(setSelectedId);
  }, []);

  function select(cliqueId: string) {
    setSelectedId(cliqueId);
    void AsyncStorage.setItem(STORAGE_KEY, cliqueId);
  }

  const clique = cliques.find((candidate) => candidate.id === selectedId) ?? cliques[0] ?? null;
  return <SelectedCliqueContext.Provider value={{ clique, select }}>{children}</SelectedCliqueContext.Provider>;
}

export function useSelectedClique(): SelectedClique {
  return useContext(SelectedCliqueContext);
}
