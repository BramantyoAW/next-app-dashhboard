/**
 * Resolve a product image URL for safe display in the browser.
 * 
 * - If the URL points to the backend (e.g. http://127.0.0.1:8000/storage/...),
 *   route it through the /api/proxy-image endpoint so the backend URL is never exposed.
 * - If the URL is empty/null, return the default product placeholder.
 * - Otherwise, return the URL as-is (external URLs, data:, blob:, etc.)
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || imageUrl.trim() === '') {
    return '/default-product.svg';
  }

  // Backend URLs should be proxied
  const backendPatterns = [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'https://services.tyb-services.site',
  ];

  for (const pattern of backendPatterns) {
    if (imageUrl.startsWith(pattern)) {
      return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    }
  }

  // blob:, data:, or external URLs — pass through
  return imageUrl;
}
