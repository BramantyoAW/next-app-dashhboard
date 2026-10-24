'use client';

/**
 * Split view untuk panel AI (Design / Manage).
 *
 * Dulu panel AI `fixed` + backdrop sehingga menutupi halaman. Sekarang panel
 * menempel di kolom kanan dan konten digeser selebar panel (lihat aturan
 * `html.ai-split-on body` di globals.css). Owner bisa membaca halaman sambil
 * melihat chat.
 *
 * Dipakai dari dalam panel: `useAiSplitView(open, lebarPx)`.
 * Hitungan modul menjaga konten tetap tergeser bila dua panel terbuka, dan
 * `--ai-split-w` jadi satu sumber kebenaran untuk lebar panel + padding body.
 */
import { useEffect } from 'react';

export const AI_SPLIT_WIDTH = 420;

let openCount = 0;

export function useAiSplitView(open: boolean, width: number = AI_SPLIT_WIDTH): void {
  // Geser konten selama panel terbuka.
  useEffect(() => {
    if (!open) return;

    openCount += 1;
    document.documentElement.classList.add('ai-split-on');

    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        document.documentElement.classList.remove('ai-split-on');
        document.documentElement.style.removeProperty('--ai-split-w');
      }
    };
  }, [open]);

  // Lebar panel bisa berubah (mis. tombol perbesar di editor Puck).
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.setProperty('--ai-split-w', `${width}px`);
    return () => {
      document.documentElement.style.removeProperty('--ai-split-w');
    };
  }, [open, width]);
}
