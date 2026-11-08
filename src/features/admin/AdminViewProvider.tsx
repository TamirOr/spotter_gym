import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { View } from './adminView';

const STORAGE_KEY = 'admin-view';

type AdminView = {
  /** The stored choice, or null when none was made. Null until read from the device. */
  stored: string | null;
  ready: boolean;
  switchTo: (view: View) => void;
};

const AdminViewContext = createContext<AdminView>({ stored: null, ready: false, switchTo: () => {} });

/** An admin's choice between the admin screens and the regular app, remembered on the device. */
export function AdminViewProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then(setStored)
      .finally(() => setReady(true));
  }, []);

  function switchTo(view: View) {
    setStored(view);
    void AsyncStorage.setItem(STORAGE_KEY, view);
  }

  return <AdminViewContext.Provider value={{ stored, ready, switchTo }}>{children}</AdminViewContext.Provider>;
}

export function useAdminView(): AdminView {
  return useContext(AdminViewContext);
}
