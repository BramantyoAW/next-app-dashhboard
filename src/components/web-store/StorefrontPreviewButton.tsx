'use client';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'om-bot.com';

export function StorefrontPreviewButton({ hash, isActive }: { hash?: string | null; isActive: boolean }) {
  if (!hash || !isActive) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed"
      >
        Buka Storefront
      </button>
    );
  }
  // Development: use lvh.me suffix for cross-subdomain preview; in prod use real domain.
  const isDev = process.env.NODE_ENV !== 'production';
  const target = isDev
    ? `http://${hash}.lvh.me:3000`
    : `https://${hash}.${MAIN_DOMAIN}`;
  return (
    <a
      href={target}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
    >
      Buka Storefront
      <span aria-hidden className="text-xs opacity-80">↗</span>
    </a>
  );
}
