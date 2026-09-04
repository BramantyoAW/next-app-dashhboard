'use client';

import { useRef, useState } from 'react';
import type { CustomField } from '@puckeditor/core';
import { uploadPageImage } from '@/graphql/mutation/webstore';

/**
 * Field Puck custom untuk URL gambar + tombol upload dari komputer.
 *
 * Render: input teks URL (bisa tempel URL internet) + tombol "Upload" yang
 * mengirim file ke mutation uploadPageImage (BE menyimpan di
 * storage/public/page-blocks) lalu mengisi nilai dengan URL hasil.
 *
 * Token GraphQL tidak tersedia di config Puck (statis), jadi editor memanggil
 * setUploadToken() sebelum me-render <Puck>.
 */
let uploadToken = '';
export function setUploadToken(t: string) {
  uploadToken = t;
}

export function imageUploadField(): CustomField<string> {
  return {
    type: 'custom',
    label: 'Gambar',
    render: ImageUploadControl,
  };
}

function ImageUploadControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const res = await uploadPageImage(uploadToken, f);
      onChange(res.uploadPageImage);
    } catch (e: any) {
      setErr(e?.message ?? 'Upload gagal');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5" style={{ padding: '2px 0' }}>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="mb-1 h-16 w-full rounded-md object-cover"
        />
      )}
      <input
        type="text"
        value={value || ''}
        placeholder="Tempel URL gambar..."
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1 text-xs outline-none focus:border-black/40"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Mengunggah...' : 'Upload dari komputer'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-md border border-black/15 px-2 py-1 text-[11px] text-slate-500"
          >
            Hapus
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {err && <div className="text-[10px] text-red-600">{err}</div>}
    </div>
  );
}
