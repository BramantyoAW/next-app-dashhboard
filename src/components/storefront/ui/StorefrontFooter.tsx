import Link from 'next/link';
import { Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import type { WebChrome } from '@/lib/webTheme';

function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes('instagram')) return <Instagram className="h-4 w-4" />;
  if (p.includes('facebook')) return <Facebook className="h-4 w-4" />;
  if (p.includes('twitter') || p.includes('x')) return <Twitter className="h-4 w-4" />;
  if (p.includes('whatsapp') || p.includes('wa')) return <MessageCircle className="h-4 w-4" />;
  return <span className="h-4 w-4 rounded-full bg-current/20" />;
}

/** Storefront footer — editorial design. Dark bg, clean 3-column layout. */
export function StorefrontFooter({
  hash,
  storeName,
  brand,
  navPages,
  chrome,
}: {
  hash: string;
  storeName: string;
  brand: string;
  navPages: { slug: string; title: string }[];
  chrome?: { footer: Partial<WebChrome['footer']> } | null;
}) {
  const footer = chrome?.footer ?? {};
  const aboutText = footer.about_text || 'Belanja mudah, antar cepat, pembayaran fleksibel. Pesan langsung dari toko online kami.';
  const payments = Array.isArray(footer.payments) && footer.payments.length > 0 ? footer.payments : ['BCA', 'QRIS', 'COD'];
  const socials = Array.isArray(footer.socials) ? footer.socials : [];
  const showPoweredBy = footer.show_powered_by ?? true;
  const copyright = footer.copyright_text || `${new Date().getFullYear()} ${storeName}`;

  return (
    <footer
      className="mt-20 border-t"
      style={{
        background: 'var(--text, #17150f)',
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brand column */}
        <div>
          <div
            className="text-sm font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--bg, #f4f1ea)' }}
          >
            {storeName}
          </div>
          <p
            className="mt-3 max-w-xs text-sm leading-relaxed"
            style={{ color: 'rgba(245,245,243,0.5)' }}
          >
            {aboutText}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center border transition-colors hover:border-white/30"
                  style={{ color: 'rgba(245,245,243,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}
                  title={s.platform}
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div>
          <div
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(245,245,243,0.35)' }}
          >
            Navigasi
          </div>
          <ul className="space-y-2.5">
            <li>
              <Link
                href={`/storefront/${hash}`}
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'rgba(245,245,243,0.6)' }}
              >
                Beranda
              </Link>
            </li>
            {navPages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/storefront/${hash}/${p.slug}`}
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: 'rgba(245,245,243,0.6)' }}
                >
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/storefront/${hash}/cart`}
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'rgba(245,245,243,0.6)' }}
              >
                Keranjang
              </Link>
            </li>
            <li>
              <Link
                href={`/storefront/${hash}/orders`}
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'rgba(245,245,243,0.6)' }}
              >
                Pesanan Saya
              </Link>
            </li>
          </ul>
        </div>

        {/* Payments + info */}
        <div>
          <div
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(245,245,243,0.35)' }}
          >
            Pembayaran
          </div>
          <div className="flex flex-wrap gap-2">
            {payments.map((p) => (
              <span
                key={p}
                className="border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(245,245,243,0.6)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 py-5 text-[11px]">
          <span style={{ color: 'rgba(245,245,243,0.3)' }}>© {copyright}</span>
          {showPoweredBy && (
            <span style={{ color: 'rgba(245,245,243,0.3)' }}>
              Powered by{' '}
              <a
                href="https://om-bot.com"
                className="underline transition-colors hover:text-white/60"
              >
                om-bot.com
              </a>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
