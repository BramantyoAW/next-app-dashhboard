export function resolveImageUrl(url: string) {
  if (!url) return "/default-product.svg";

  if (url.startsWith("/storage")) {
    const fullUrl = (process.env.NEXT_PUBLIC_BACKEND_BASE || "") + url;
    if (fullUrl.includes("127.0.0.1") || fullUrl.includes("localhost") || fullUrl.includes("laravel") || fullUrl.includes("nginx-server")) {
      return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  }

  if (
    url.includes("laravel:8000") || 
    url.includes("127.0.0.1:8000") || 
    url.includes("localhost:8000") ||
    url.includes("nginx-server:80")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }

  return url;
}