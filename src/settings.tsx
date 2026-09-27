import React, { createContext, useContext, useEffect, useState } from 'react';
import { boardThemes } from './theme';
import { load, save } from './storage';

export type PieceStyle = 'glass' | 'royal' | 'classic';
type S = { boardTheme: keyof typeof boardThemes; pieceStyle: PieceStyle };
const DEFAULT: S = { boardTheme: 'grey', pieceStyle: 'glass' };

const Ctx = createContext<{ s: S; update: (p: Partial<S>) => void; ready: boolean }>({ s: DEFAULT, update: () => {}, ready: false });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<S>(DEFAULT);
  const [ready, setReady] = useState(false);
  useEffect(() => { load<S>('settings', DEFAULT).then((v) => { setS({ ...DEFAULT, ...v }); setReady(true); }); }, []);
  const update = (p: Partial<S>) => setS((prev) => { const n = { ...prev, ...p }; save('settings', n); return n; });
  return <Ctx.Provider value={{ s, update, ready }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
export const useSettingsReady = () => useContext(Ctx).ready;
