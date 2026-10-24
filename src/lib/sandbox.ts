'use client';

/**
 * Sandboxed execution for owner custom JS (#11).
 *
 * Owners (and the AI assistant) can attach arbitrary JavaScript to a `custom`
 * block. That code runs in the visitor's browser on the storefront, so it must
 * never be able to touch customer credentials or page-level state:
 *
 *  - cookies & localStorage/sessionStorage  → customer JWT lives here
 *  - the parent DOM                         → could read other blocks, inject
 *                                             keyloggers, deface the page
 *  - network calls with ambient credentials → fetch/XHR send cookies
 *
 * Strategy: run the script inside a same-origin **iframe sandbox**
 * (`sandbox="allow-scripts"`, no allow-same-origin) with a strict CSP that
 * blocks everything except inline script/style/images. Inside that frame:
 *
 *  - document.cookie / localStorage access throws (opaque origin)
 *  - fetch/XHR to the backend/API origins are blocked by CSP connect-src
 *  - the frame's document is fully separate from the parent document
 *
 * The iframe gets the same height as the block container (custom scripts are
 * expected to render their own UI inside the frame document). Fallback: if
 * sandboxed iframes are unavailable (very old browsers), we render nothing and
 * log a warning rather than executing unsandboxed.
 */

export type SandboxHandle = {
  /** Remove the iframe and detach listeners. Idempotent. */
  destroy: () => void;
};

const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: https: http:",
  "font-src data: https: http:",
  "media-src data: blob: https: http:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** Scripts we refuse to run even inside the sandbox. */
const DENY_PATTERNS: RegExp[] = [
  /\btop\b\s*\.\s*\blocation\b/i,
  /\bparent\b\s*\.\s*\blocation\b/i,
  /\bwindow\s*\.\s*top\b/i,
  /\bpostMessage\b/i,
];

export function jsLooksSafe(js: string): boolean {
  return !DENY_PATTERNS.some((re) => re.test(js));
}

/**
 * Mount `js` inside a sandboxed iframe appended to `container`.
 * The iframe document is pre-populated with `html` and `css` so owner scripts
 * operate on their own block content, exactly like the previous new Function()
 * behavior where `this` was the block element.
 */
export function runSandboxedJs(
  container: HTMLElement,
  opts: { js: string; html?: string; css?: string; maxHeight?: number }
): SandboxHandle | null {
  const js = (opts.js ?? '').trim();
  if (!js) return null;

  if (!jsLooksSafe(js)) {
    console.warn('[sandbox] custom JS blocked: script touches frame parents or postMessage');
    return null;
  }

  let frame: HTMLIFrameElement | null = null;
  let destroyed = false;

  try {
    frame = document.createElement('iframe');
    // No allow-same-origin → opaque origin: storage & cookies throw.
    // No allow-top-navigation → cannot redirect the storefront page.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('csp', SANDBOX_CSP);
    frame.setAttribute('title', 'Custom block content');
    frame.style.cssText = [
      'display:block',
      'width:100%',
      'border:0',
      'background:transparent',
      'color-scheme:light',
      `min-height:${Math.max(40, opts.maxHeight ?? 80)}px`,
    ].join(';');
    container.appendChild(frame);

    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return null;
    }

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<style>html,body{margin:0;padding:0;font-family:inherit;background:transparent}` +
        `img,video{max-width:100%}</style>` +
        (opts.css ? `<style>${opts.css.replace(/<\/style/gi, '<\\/style')}</style>` : '') +
        `</head><body>${(opts.html ?? '').replace(/<\/script/gi, '<\\/script')}` +
        `<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script>` +
        `</body></html>`
    );
    doc.close();

    // Keep the frame tall enough for the rendered content.
    const resize = () => {
      if (!frame || !frame.contentDocument) return;
      const h = Math.max(40, frame.contentDocument.body?.scrollHeight ?? 0);
      frame.style.height = `${Math.min(h, 2000)}px`;
    };
    const interval = window.setInterval(resize, 400);
    frame.addEventListener('load', resize);

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        window.clearInterval(interval);
        frame?.remove();
        frame = null;
      },
    };
  } catch (e) {
    console.error('[sandbox] failed to mount sandboxed custom JS:', e);
    frame?.remove();
    return null;
  }
}
