'use client';

import { useEffect, useId, useRef } from 'react';

/**
 * Render blok HTML/CSS/JS kustom milik owner (dangerouslySetInnerHTML).
 * CSS di-scope ke blok via atribut `data-blk`, supaya tidak bocor ke
 * seluruh halaman. JS dijalankan setelah blok mount (useEffect).
 */
export function CustomBlockRenderer({ html, css, js }: { html: string; css: string; js: string }) {
  const scopeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ref = useRef<HTMLDivElement>(null);

  // Jalankan JS kustom setelah DOM blok terpasang.
  useEffect(() => {
    if (!js.trim() || !ref.current) return;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(js);
      fn.call(ref.current);
    } catch (e) {
      console.error('Custom block JS error:', e);
    }
  }, [js]);

  if (!html.trim()) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
        Blok kustom kosong.
      </div>
    );
  }

  return (
    <div ref={ref} data-blk={scopeId}>
      {css.trim() && (
        <style
          dangerouslySetInnerHTML={{
            // Scope: selektor hanya berlaku di dalam blok ini.
            __html: `[data-blk="${scopeId}"] ${css}`,
          }}
        />
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
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
