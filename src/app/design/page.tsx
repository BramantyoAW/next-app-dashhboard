'use client';

/**
 * STYLEGUIDE HIDUP — Fase 0.
 *
 * Halaman ini TIDAK menyentuh UI yang sudah ada. Semua aturan CSS di-scope
 * ke `.ds`, jadi halaman /login, /dashboard, /owner tidak berubah sedikit pun.
 *
 * Kegunaan:
 *  - Bandingkan 3 arah warna berdampingan, di layar yang sama.
 *  - Lihat semua primitive (tombol, form, tabel, badge, empty state).
 *  - Toggle ke "Bandingkan" untuk melihat ketiganya sekaligus.
 *
 * Setelah satu arah dipilih, token pemenang dipindah ke globals.css (Fase 1).
 */
import { useState } from 'react';
import '@/components/ui/design-tokens.css';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui/ds';

type ThemeId = 'warm' | 'slate' | 'soft';

const THEMES: { id: ThemeId; name: string; tagline: string }[] = [
  {
    id: 'warm',
    name: 'A. Netral Hangat',
    tagline: 'Manusiawi, tidak korporat. Abu hangat + teal.',
  },
  {
    id: 'slate',
    name: 'B. Slate Tegas',
    tagline: 'Padat & kontras tinggi. Terasa seperti alat kerja.',
  },
  {
    id: 'soft',
    name: 'C. Lembut Modern',
    tagline: 'Radius besar, banyak napas. Paling dekat ke Shopify.',
  },
];

/* ── Potongan UI yang dipakai untuk membandingkan tema ────────────── */
function Specimen({ compact = false }: { compact?: boolean }) {
  return (
    <div className="ds" style={{ padding: compact ? 16 : 24 }}>
      <PageHeader
        title="Pesanan"
        description="Kelola pesanan masuk dari web store."
        actions={
          <>
            <Button variant="secondary" size="sm">
              Ekspor
            </Button>
            <Button size="sm">Pesanan Baru</Button>
          </>
        }
      />

      <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone="ok">Lunas</Badge>
        <Badge tone="warn">Menunggu</Badge>
        <Badge tone="bad">Batal</Badge>
        <Badge tone="info">Dikirim</Badge>
        <Badge>Draf</Badge>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="ds-card" style={{ overflow: 'hidden' }}>
          <table className="ds-table">
            <thead>
              <tr>
                <th>Pesanan</th>
                <th>Pembeli</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="ds-num">#1042</td>
                <td>Rina Wulandari</td>
                <td>
                  <Badge tone="ok">Lunas</Badge>
                </td>
                <td className="num ds-num">Rp 275.000</td>
              </tr>
              <tr>
                <td className="ds-num">#1041</td>
                <td>Agus Santoso</td>
                <td>
                  <Badge tone="warn">Menunggu</Badge>
                </td>
                <td className="num ds-num">Rp 89.500</td>
              </tr>
              <tr>
                <td className="ds-num">#1040</td>
                <td>Siti Aminah</td>
                <td>
                  <Badge tone="info">Dikirim</Badge>
                </td>
                <td className="num ds-num">Rp 1.240.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {!compact && (
        <div style={{ marginTop: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          <Field label="Nama toko" hint="Tampil di halaman toko." htmlFor="ds-nama">
            <Input id="ds-nama" placeholder="Demo Stores" defaultValue="Demo Stores" />
          </Field>
          <Field label="Kategori" htmlFor="ds-kat">
            <Select id="ds-kat" defaultValue="makanan">
              <option value="makanan">Makanan</option>
              <option value="minuman">Minuman</option>
            </Select>
          </Field>
          <Field label="Email" error="Format email tidak valid." htmlFor="ds-email">
            <Input id="ds-email" aria-invalid="true" defaultValue="salah@" />
          </Field>
        </div>
      )}

      {!compact && (
        <div style={{ marginTop: 20 }}>
          <div className="ds-card" style={{ overflow: 'hidden' }}>
            <EmptyState
              title="Belum ada produk"
              body="Tambahkan produk pertama supaya toko bisa menerima pesanan."
              action={<Button>Tambahkan Produk</Button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Daftar token untuk ditampilkan ────────────────────────────── */
const TOKEN_KEYS: { key: string; label: string }[] = [
  { key: '--ds-bg', label: 'bg' },
  { key: '--ds-surface', label: 'surface' },
  { key: '--ds-surface-2', label: 'surface-2' },
  { key: '--ds-fg', label: 'fg' },
  { key: '--ds-fg-muted', label: 'fg-muted' },
  { key: '--ds-border', label: 'border' },
  { key: '--ds-primary', label: 'primary' },
  { key: '--ds-accent', label: 'accent' },
  { key: '--ds-danger', label: 'danger' },
];

function TokenList({ theme }: { theme: ThemeId }) {
  return (
    <div className="ds" data-theme={theme} style={{ padding: 16, borderRadius: 10 }}>
      <div className="ds-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(86px,1fr))' }}>
        {TOKEN_KEYS.map((t) => (
          <div className="ds-swatch" key={t.key}>
            <div className="ds-swatch-chip" style={{ background: `var(${t.key})` }} />
            <div className="ds-swatch-meta">
              <div className="ds-caption" style={{ color: 'var(--ds-fg)' }}>
                {t.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<ThemeId>('soft');
  const [mode, setMode] = useState<'one' | 'compare'>('one');

  return (
    <div style={{ minHeight: '100vh', background: '#eef0f4', padding: '24px 16px 64px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Header halaman — sengaja netral, bukan bagian dari tema */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #dfe3ea',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            color: '#18181b',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em' }}>Design system — Fase 0</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#71717a', maxWidth: 560 }}>
                Tiga arah warna, semua primitive. Pilih satu, saya kunci jadi token dan dipakai seluruh dashboard.
                Halaman ini tidak mengubah UI yang sudah jalan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, background: '#f4f4f7', padding: 4, borderRadius: 9 }}>
              {(['one', 'compare'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    border: 0,
                    cursor: 'pointer',
                    padding: '7px 13px',
                    borderRadius: 7,
                    fontSize: 12.5,
                    fontWeight: 550,
                    fontFamily: 'inherit',
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? '#18181b' : '#71717a',
                    boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,.07)' : 'none',
                  }}
                >
                  {m === 'one' ? 'Satu tema' : 'Bandingkan'}
                </button>
              ))}
            </div>
          </div>

          {/* Pemilih tema */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setMode('one');
                }}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: `1px solid ${theme === t.id && mode === 'one' ? '#18181b' : '#e4e4ea'}`,
                  background: '#fff',
                  borderRadius: 10,
                  padding: '10px 14px',
                  minWidth: 200,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>{t.tagline}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Isi */}
        {mode === 'one' ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="ds-card" style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid #dfe3ea' }}>
              <Specimen />
            </div>

            <div style={{ background: '#fff', border: '1px solid #dfe3ea', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'system-ui' }}>
                Palet — {THEMES.find((t) => t.id === theme)?.name}
              </div>
              <TokenList theme={theme} />
              <p style={{ fontSize: 12, color: '#71717a', margin: '12px 0 0', fontFamily: 'system-ui' }}>
                Hanya 9 warna. Semua komponen mengambil dari sini — tidak ada kelas warna hardcoded.
              </p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #dfe3ea', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: 'system-ui' }}>Komponen dasar</div>
              <div className="ds" data-theme={theme} style={{ padding: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <Button>Simpan</Button>
                  <Button variant="secondary">Batal</Button>
                  <Button variant="ghost">Lewati</Button>
                  <Button variant="danger">Hapus</Button>
                  <Button disabled>Nonaktif</Button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <Button size="sm">Kecil</Button>
                  <Button size="sm" variant="secondary">
                    Kecil sekunder
                  </Button>
                </div>
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
                  <Field label="Nama produk" hint="Maksimal 80 karakter." htmlFor="a1">
                    <Input id="a1" placeholder="Contoh: Kap Jumbo Putih" />
                  </Field>
                  <Field label="Harga" htmlFor="a2">
                    <Input id="a2" inputMode="numeric" placeholder="5500" />
                  </Field>
                  <Field label="Deskripsi" htmlFor="a3">
                    <Textarea id="a3" placeholder="Ceritakan singkat produk ini…" />
                  </Field>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #dfe3ea', borderRadius: 14, padding: 18, fontFamily: 'system-ui' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Aturan yang saya pegang</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#52525b', lineHeight: 1.8 }}>
                <li>Satu aksen saja. Sisanya netral.</li>
                <li>Enam ukuran teks. Tidak ada ukuran di antaranya.</li>
                <li>Spacing kelipatan 4px, tanpa pengecualian.</li>
                <li>Radius &amp; tinggi tombol konsisten di semua halaman.</li>
                <li>Pemisah utama whitespace, bukan garis.</li>
                <li>Empty state selalu punya satu tombol aksi.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
            {THEMES.map((t) => (
              <div key={t.id}>
                <div
                  style={{
                    fontFamily: 'system-ui',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#18181b',
                  }}
                >
                  {t.name}
                </div>
                <div className="ds-card" style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid #dfe3ea' }}>
                  <div className="ds" data-theme={t.id}>
                    <Specimen compact />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <TokenList theme={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontFamily: 'system-ui', fontSize: 12, color: '#8a8f99', marginTop: 24, textAlign: 'center' }}>
          Halaman ini terisolasi. Menghapus folder ini tidak mempengaruhi apa pun.
        </p>
      </div>
    </div>
  );
}
