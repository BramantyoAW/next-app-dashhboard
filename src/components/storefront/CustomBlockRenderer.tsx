'use client';

import { useEffect, useId, useRef } from 'react';
import { runSandboxedJs, type SandboxHandle } from '@/lib/sandbox';

/**
 * Render blok HTML/CSS/JS kustom milik owner.
 *
 * Security (#11): HTML/CSS/JS dieksekusi di dalam iframe sandbox
 * (`sandbox="allow-scripts"` + CSP strict) — bukan `new Function()` di
 * document utama. Kode owner tidak bisa mengakses cookie/localStorage
 * (token customer), DOM halaman di luar blok, atau fetch API dengan
 * kredensial ambient.
 */
export function CustomBlockRenderer({ html, css, js }: { html: string; css: string; js: string }) {
  const scopeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SandboxHandle | null>(null);

  // Mount the sandboxed frame once per (html, css, js) change.
  useEffect(() => {
    if (!ref.current) return;
    // Tanpa JS: render inline (HTML+CSS saja aman — CSS sudah di-scope,
    // HTML tidak memuat script yang dieksekusi di dokumen utama karena
    // dangerouslySetInnerHTML tidak menjalankan <script> tag).
    if (!js.trim()) {
      handleRef.current?.destroy();
      handleRef.current = null;
      return;
    }
    handleRef.current = runSandboxedJs(ref.current, { js, html, css });
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [js, html, css]);

  const showInline = !js.trim();

  if (!html.trim() && !js.trim()) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
        Blok kustom kosong.
      </div>
    );
  }

  return (
    <div ref={ref} data-blk={scopeId}>
      {showInline && (
        <>
          {css.trim() && (
            <style
              dangerouslySetInnerHTML={{
                // Scope: selektor hanya berlaku di dalam blok ini.
                __html: `[data-blk="${scopeId}"] ${css}`,
              }}
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
      {/* Dengan JS: konten dirender di dalam sandboxed iframe oleh runSandboxedJs */}
    </div>
  );
}

/** Embed video YouTube (iframe) atau MP4 (<video>). */
export function VideoEmbed({ url }: { url: string }) {
  const id = extractYouTubeId(url);
  if (id) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title="Video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video src={url} controls className="w-full h-full object-cover" />
  );
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : null;
}
