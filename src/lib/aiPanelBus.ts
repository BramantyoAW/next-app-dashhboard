'use client';

/**
 * Pembuka panel AI dari header halaman.
 *
 * Tombol "Design With OmBot Ai" duduk di header editor, dan owner minta
 * "Manage OmBot AI" ikut ke sana — bukan tombol melayang di sudut kanan
 * bawah. Supaya tombol bisa berada di layout/header sementara state
 * buka-tutup tetap milik panel, keduanya bicara lewat event, bukan props.
 *
 * `scope` adalah pemisah yang sama dengan riwayat chat: satu tombol hanya
 * membuka panel dengan scope yang sama.
 */
const EVENT = 'ombot:ai-panel-open';

export function openAiPanel(scope: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: scope }));
}

/** Kembalikan fungsi pembersih untuk dipakai di `useEffect`. */
export function onAiPanelOpen(scope: string, handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === scope) handler();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
