'use client';

import { PuckDynamicContext } from '@/lib/puckDynamic';
import {
  StorefrontAnnouncementBar,
  StorefrontHeaderFromProps,
  StorefrontFooterBlock,
} from '@/lib/puckLabConfig';
import { ScopedBlockWrap } from '@/lib/puckScoped';
import type { ReactNode } from 'react';

/**
 * Chrome blok (AnnouncementBar/StoreHeader/StoreFooter) untuk halaman SYSTEM
 * (account, orders, sign-in) — mengambil blok chrome dari halaman HOME yang
 * owner kelola di Page Builder. Sehingga header & footer halaman akun SAMA
 * dengan halaman Puck (customable owner) — Task D keputusan A.
 *
 * Data diambil dari konten puck home (`blocks.puck.content`). Bila home belum
 * punya blok chrome, fallback diam (tanpa header/footer) — tidak crash.
 */
export default function StorefrontPuckChrome({
  hash,
  homeBlocks,
  children,
}: {
  hash: string;
  homeBlocks: unknown;
  children: ReactNode;
}) {
  const content: { type?: string; props?: Record<string, any> }[] = Array.isArray(homeBlocks)
    ? homeBlocks
    : ((homeBlocks as any)?.puck?.content ?? []);

  const announcement = content.find((b) => b.type === 'AnnouncementBar');
  const header = content.find((b) => b.type === 'StoreHeader');
  const footer = content.find((b) => b.type === 'StoreFooter');

  const id = (b?: { props?: Record<string, any> }) => String(b?.props?.id ?? '');

  return (
    <PuckDynamicContext.Provider value={{ hash, storeName: '', product: null, products: [], cart: [] }}>
      {announcement?.props && (
        <ScopedBlockWrap id={id(announcement)} css={announcement.props.css} js={announcement.props.js}>
          <StorefrontAnnouncementBar items={announcement.props.items ?? []} />
        </ScopedBlockWrap>
      )}
      {header?.props && (
        <ScopedBlockWrap id={id(header)} css={header.props.css} js={header.props.js}>
          <StorefrontHeaderFromProps {...header.props} />
        </ScopedBlockWrap>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      {footer?.props && (
        <ScopedBlockWrap id={id(footer)} css={footer.props.css} js={footer.props.js}>
          <StorefrontFooterBlock {...footer.props} />
        </ScopedBlockWrap>
      )}
    </PuckDynamicContext.Provider>
  );
}
