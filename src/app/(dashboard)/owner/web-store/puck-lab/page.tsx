'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code2, Eye, Pencil, ExternalLink } from 'lucide-react';
import { Puck, Render, resolveAllData } from '@puckeditor/core';
import puckLabConfig from '@/lib/puckLabConfig';

/**
 * PUCK LAB — prototipe (belum terhubung ke DB).
 *
 * Menguji konsep "seluruh halaman = kanvas drag & drop":
 *  - zona HEADER, BODY, FOOTER — header custom ikut di-drag, tidak statis.
 *  - Edit: panel kiri palet komponen, tengah kanvas, kanan properti.
 *  - Preview: hasil render storefront.
 *  - Data tersimpan di localStorage (kunci puck-lab-data). Belum di-save ke BE.
 */

const LS_KEY = 'puck-lab-data';

/** Render hasil resolve (defaultProps + id) agar tampil persis seperti editor. */
function ResolvedPuckPreview({ data }: { data: any }) {
  const [resolved, setResolved] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    resolveAllData(data, puckLabConfig as any)
      .then((d) => {
        if (alive) setResolved(d);
      })
      .catch(() => {
        if (alive) setResolved(data);
      });
    return () => {
      alive = false;
    };
  }, [data]);
  if (!resolved) return <div className="ds-small p-10 text-center">Menyiapkan preview...</div>;
  return <Render config={puckLabConfig} data={resolved} />;
}

const initialData = {
  root: {
    props: { title: 'Home' },
  },
  content: [
    { type: 'StoreHeader', props: { id: 'hdr-1' } },
    { type: 'Hero', props: { id: 'hero-1' } },
    { type: 'Products', props: { id: 'prod-1' } },
    { type: 'Text', props: { id: 'txt-1' } },
    { type: 'Cta', props: { id: 'cta-1' } },
    { type: 'StoreFooter', props: { id: 'ftr-1' } },
  ],
};

export default function PuckLabPage() {
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);

  // Hydrate dari localStorage (client-only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData(initialData);
      }
    } catch {
      setData(initialData);
    }
  }, []);

  if (!data) {
    return <div className="ds-small py-20 text-center">Memuat Puck Lab...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Bar atas */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-surface)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/owner/web-store" className="ds-btn" data-variant="ghost">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="ds-h2">🧪 Puck Lab — Visual Editor (Prototipe)</div>
            <div className="ds-caption">Seluruh halaman = kanvas drag&drop: header, body, footer bisa di-drag & diedit</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border p-0.5" style={{ borderColor: 'var(--ds-border)' }}>
            <button
              onClick={() => setMode('edit')}
              className="ds-btn-sm"
              data-tone={mode === 'edit' ? undefined : 'neutral'}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => setMode('preview')}
              className="ds-btn-sm"
              data-tone={mode === 'preview' ? undefined : 'neutral'}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="ds-btn-sm"
            data-tone="neutral"
          >
            <Code2 size={13} /> {copied ? 'Tersalin!' : 'Salin JSON'}
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="flex-1">
          <Puck
            config={puckLabConfig}
            data={data}
            onPublish={(next) => {
              setData(next);
              try {
                localStorage.setItem(LS_KEY, JSON.stringify(next));
              } catch {}
            }}
            iframe={{ enabled: false }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ background: 'var(--ds-surface-2)' }}>
          <div className="ds-card mx-auto max-w-4xl" style={{ minHeight: '90vh' }}>
            <ResolvedPuckPreview data={data} />
          </div>
          <div className="ds-caption py-4 text-center">
            <ExternalLink size={12} className="inline mr-1" />
            Ini tampilan storefront jika layout disimpan. Belum tersambung ke web store asli (prototipe).
          </div>
        </div>
      )}
    </div>
  );
}
