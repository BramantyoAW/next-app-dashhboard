import type { AiAssistantResult } from '@/graphql/mutation/aiAssistant';

/**
 * Panggil AI assistant via SSE (Opsi C):
 *  1. event `status` — instan, FE tampilkan "AI mengetik…" (tanpa freeze)
 *  2. event `result` — JSON penuh (reply + changes) setelah model selesai
 *  3. event `error` — pesan kegagalan
 *
 * Input sama persis dengan mutation GraphQL `askWebStoreAssistant`.
 * Mengembalikan hasil final; menolak bila error / tidak ada result.
 */
export async function streamAskAi(
  token: string,
  input: {
    web_store_id?: string | number | null;
    scope?: string;
    message: string;
    context?: unknown;
    history?: { role: string; content: string }[];
    images?: { data?: string; bytes?: string }[];
  },
  onStatus?: (stage: string, message: string) => void,
): Promise<AiAssistantResult> {
  const backend =
    process.env.NEXT_PUBLIC_BACKEND_BASE?.trim() ||
    (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_BACKEND_BASE : '') ||
    'http://localhost:8000';

  const ctrl = new AbortController();
  const res = await fetch(`${backend}/api/ai/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ input }),
    signal: ctrl.signal,
    cache: 'no-store',
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '');
    throw new Error(`AI stream HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;
  let result: AiAssistantResult | null = null;
  let errorMsg = '';

  const parsePayload = (payload: string) => {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  };

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) buf += decoder.decode(value, { stream: !done });

    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
      }
      const data = dataLines.map(parsePayload).find((x) => x !== null) ?? null;

      if (event === 'status' && data && onStatus) {
        onStatus(String(data.stage ?? ''), String(data.message ?? ''));
      } else if (event === 'result' && data) {
        result = data as AiAssistantResult;
      } else if (event === 'error' && data) {
        errorMsg = String(data.message ?? 'AI gagal merespons.');
      }
    }
  }

  if (errorMsg) throw new Error(errorMsg);
  if (!result) throw new Error('AI tidak mengembalikan hasil. Coba lagi.');
  return result;
}
