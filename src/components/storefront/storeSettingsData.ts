/**
 * Fallback data store (dari WebStore.settings + kolom) utk blok chrome
 * (StoreHeader/StoreFooter/AnnouncementBar) & CTA.
 *
 * File NON-client (dipakai server component [hash]/layout.tsx) — pisah dari
 * context client supaya bisa di-import server-side.
 */

export type StoreChromeSettings = {
  /** Notify WhatsApp (kolom web_store.notify_whatsapp), mis. '0812…'. */
  waPhone?: string | null;
  /** Sosmed dari settings.chrome.footer.socials [{url,platform}]. */
  socials?: { url: string; platform: string }[];
  about_text?: string;
  copyright_text?: string;
  announcement?: string[];
  payments?: string[];
};

/** Buat objek settings dari web store record (normalisasi minimal). */
export function chromeSettingsFromWs(ws: {
  notify_whatsapp?: string | null;
  settings?: Record<string, any> | null;
}): StoreChromeSettings {
  const s = (ws.settings ?? {}) as any;
  const footer = s?.chrome?.footer ?? {};
  const announcement = s?.chrome?.announcement ?? {};
  return {
    waPhone: ws.notify_whatsapp ?? (s?.notify_whatsapp as string | undefined) ?? null,
    socials: Array.isArray(footer.socials)
      ? footer.socials.map((x: any) => ({ url: x.url, platform: x.platform }))
      : undefined,
    about_text: footer.about_text,
    copyright_text: footer.copyright_text,
    announcement: Array.isArray(announcement.items) ? announcement.items : undefined,
    payments: Array.isArray(footer.payments) ? footer.payments : undefined,
  };
}
