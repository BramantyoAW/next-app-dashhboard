import Link from 'next/link';
import { Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import type { WebChrome } from '@/lib/webTheme';

function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes('instagram')) return <Instagram className="h-4 w-4" />;
  if (p.includes('facebook')) return <Facebook className="h-4 w-4" />;
  if (p.includes('twitter') || p.includes('x')) return <Twitter className="h-4 w-4" />;
  if (p.includes('whatsapp') || p.includes('wa')) return <MessageCircle className="h-4 w-4" />;
  return <span className="h-4 w-4 rounded-full bg-slate-200" />;
}

/** Storefront footer (generic). Brand column + quick links + payments + credits.
 *  Config dari `chrome.footer` (Setup): about text, payment badges, socials,
 *  powered-by & copyright bisa diubah owner. */
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
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-base font-extrabold tracking-tight" style={{ color: brand }}>
            {storeName}
          </div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{aboutText}</p>
          {socials.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  title={s.platform}
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Menu</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`/storefront/${hash}`} className="text-slate-600 hover:text-slate-900">
                Beranda
              </Link>
            </li>
            {navPages.map((p) => (
              <li key={p.slug}>
                <Link href={`/storefront/${hash}/${p.slug}`} className="text-slate-600 hover:text-slate-900">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Belanja</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`/storefront/${hash}/cart`} className="text-slate-600 hover:text-slate-900">
                Keranjang
              </Link>
            </li>
            <li>
              <Link href={`/storefront/${hash}/orders`} className="text-slate-600 hover:text-slate-900">
                Pesanan Saya
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Pembayaran</div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
            {payments.map((p) => (
              <span key={p} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-slate-400">
          <span>© {copyright}</span>
          {showPoweredBy && (
            <span>
              Powered by{' '}
              <a href="https://om-bot.com" className="underline hover:text-slate-600">
                om-bot.com
              </a>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
