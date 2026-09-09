'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StoreChromeSettings } from './storeSettingsData';

/** Context client utk blok chrome membaca data store (lihat storeSettings.ts). */
export const StoreSettingsContext = createContext<StoreChromeSettings>({});

export const useStoreSettings = () => useContext(StoreSettingsContext);

/** Provider client — layout server hanya me-render <StoreSettingsProvider …>. */
export function StoreSettingsProvider({
  value,
  children,
}: {
  value: StoreChromeSettings;
  children: ReactNode;
}) {
  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
}
