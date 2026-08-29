import Link from 'next/link';

/** Storefront footer (generic). Brand column + quick links + payments + credits. */
export function StorefrontFooter({
  hash,
  storeName,
  brand,
  navPages,
}: {
  hash: string;
  storeName: string;
  brand: string;
  navPages: { slug: string; title: string }[];
}) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-base font-extrabold tracking-tight" style={{ color: brand }}>
            {storeName}
          </div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            Belanja mudah, antar cepat, pembayaran fleksibel. Pesan langsung dari toko online kami.
          </p>
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
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">BCA</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">QRIS</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">COD</span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-slate-400">
          <span>
            © {new Date().getFullYear()} {storeName}
          </span>
          <span>
            Powered by{' '}
            <a href="https://om-bot.com" className="underline hover:text-slate-600">
              om-bot.com
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
