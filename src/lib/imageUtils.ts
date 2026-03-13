export function resolveImageUrl(url: string) {
  if (!url) return "/default-product.svg";

  if (url.startsWith("/storage")) {
    return process.env.NEXT_PUBLIC_BACKEND_BASE + url;
  }

  if (url.includes("laravel:8000")) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }

  return url;
}