'use client';

import { useEffect, type ReactElement } from 'react';

/**
 * CSS & JS scoped per blok Page Builder.
 *
 * Owner bisa menambah field `css` (dan opsional `js`) di blok mana pun —
 * CSS otomatis di-scope ke blok itu saja (tidak bocor ke blok/halaman lain),
 * JS dijalankan saat blok tampil (mount).
 *
 * Scope dilakukan dgn prefix selector `[data-pb-block="<id>"]` pada tiap rule.
 * At-rule seperti @media/@supports/@container di-scope isinya; @keyframes
 * dibiarkan global (nama keyframe harus unik).
 */

/** Prefix semua selector pada satu rule CSS dgn `scope` (kecuali @-rule). */
function scopeRule(rule: string, scope: string): string {
  // rule = "sel1, sel2 { ... }" → sisipkan scope sebelum tiap selector.
  const brace = rule.indexOf('{');
  if (brace < 0) return rule;
  const selectors = rule.slice(0, brace);
  const body = rule.slice(brace);
  const scopedSelectors = selectors
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // Jangan scope pseudo/at-rule atau selector yang sudah memakai data-pb-block.
      if (s.startsWith('@') || s.includes('data-pb-block')) return s;
      // :root dsb → jangan scope (global by design utk var CSS).
      if (s === ':root' || s === 'html' || s === 'body') return s;
      return `${scope} ${s}`;
    })
    .join(', ');
  return `${scopedSelectors} ${body}`;
}

/** Cari posisi tutup kurung kurawal seimbang mulai dari openIdx (posisi '{'). */
function closingBrace(css: string, openIdx: number): number {
  let depth = 1;
  for (let i = openIdx + 1; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length - 1;
}

/** Scope seluruh stylesheet dgn selector blok. */
export function scopeCss(css: string, scope: string): string {
  const clean = (css || '').replace(/^\s+|\s+$/g, '');
  if (!clean) return '';
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    // Lewati komentar
    if (clean.startsWith('/*', i)) {
      const end = clean.indexOf('*/', i + 2);
      const stop = end < 0 ? clean.length : end + 2;
      out.push(clean.slice(i, stop));
      i = stop;
      continue;
    }
    // At-rule (media/supports/container/keyframes/font-face/page)
    const atMatch = /^@([a-zA-Z-]+)\b/.exec(clean.slice(i));
    if (atMatch) {
      const name = atMatch[1];
      const open = clean.indexOf('{', i);
      if (open < 0) {
        // at-rule tanpa blok (mis. @import/@charset) → biarkan apa adanya
        const semi = clean.indexOf(';', i);
        const stop = semi < 0 ? clean.length : semi + 1;
        out.push(clean.slice(i, stop));
        i = stop;
        continue;
      }
      const close = closingBrace(clean, open);
      const inner = clean.slice(open + 1, close);
      if (name === 'keyframes') {
        // keyframes: nama global, isi (from/to/%) jangan di-scope
        out.push(clean.slice(i, close + 1));
      } else if (name === 'media' || name === 'supports' || name === 'container' || name === 'layer') {
        const header = clean.slice(i, open).trim();
        out.push(`${header}{${scopeCss(inner, scope)}}`);
      } else {
        // font-face/dll: biarkan utuh (global)
        out.push(clean.slice(i, close + 1));
      }
      i = close + 1;
      continue;
    }
    // Rule biasa → cari '{' berikutnya (belum di dalam string? anggap aman utk kasus builder)
    const open = clean.indexOf('{', i);
    if (open < 0) {
      // sisa tanpa '{' (mungkin deklarasi lepas) — buang biar CSS tak rusak
      break;
    }
    const close = closingBrace(clean, open);
    out.push(scopeRule(clean.slice(i, close + 1), scope));
    i = close + 1;
  }
  return out.join('\n');
}

function ScopedJs({ code }: { code?: string }) {
  useEffect(() => {
    if (!code || !code.trim()) return;
    try {
      // eslint-disable-next-line no-new-func
      new Function(code)();
    } catch {
      // JS owner salah → abaikan diam-diam (jangan rusak halaman).
    }
  }, [code]);
  return null;
}

/**
 * Bungkus def komponen Puck: tambah field `css` + `js` dan scope render-nya.
 * Render asli dipanggil TANPA props `css`/`js`/`id` (tetap dgn id utk key internal?).
 */
export function withCustomCssJs<D extends { fields?: Record<string, unknown>; render: (props: any) => ReactElement }>(def: D): D {
  const render = def.render;
  return {
    ...def,
    fields: {
      ...(def.fields ?? {}),
      css: { type: 'textarea', label: 'CSS blok ini (scoped)' },
      js: { type: 'textarea', label: 'JS blok ini (dijalankan saat tampil)' },
    },
    render: (props: Record<string, unknown>) => {
      const id = String((props as any).id ?? '');
      const css = String((props as any).css ?? '');
      const js = String((props as any).js ?? '');
      const rest = { ...props };
      delete (rest as any).css;
      delete (rest as any).js;
      const scope = `[data-pb-block="${id}"]`;
      return (
        <div data-pb-block={id} className="pb-scoped">
          {css.trim() && <style>{scopeCss(css, scope)}</style>}
          <ScopedJs code={js} />
          {render(rest)}
        </div>
      );
    },
  } as D;
}
