'use client';
import { resolveImageUrl } from '@/lib/imageUtils';

/**
 * Storefront image with graceful fallback:
 * - resolves backend/localhost URLs through the Next proxy when needed
 * - falls back to a bundled SVG placeholder (never a broken image, never "no image")
 * Client component so onError fallback works in server-rendered pages.
 */
export function StorefrontImage({
  src,
  alt,
  className,
  fallback = '/default-product.svg',
  sizes,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const resolved = resolveImageUrl(src || '') || fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src !== fallback) el.src = fallback;
      }}
    />
  );
}
