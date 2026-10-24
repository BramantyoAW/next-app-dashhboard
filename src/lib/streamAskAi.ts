import type { AiAssistantResult } from '@/graphql/mutation/aiAssistant';

/**
 * Panggil AI assistant lewat jalur queue (bukan SSE).
 *
 * Backend `POST /api/ai/stream` sekarang hanya men-dispatch job dan langsung
 * membalas `202 { job_id, status: "queued" }` — AI berjalan di queue supaya
 * satu request tidak menahan worker HTTP 10–180 detik. Hasilnya diambil dengan
 * polling `GET /api/ai/job/{jobId}` sampai `done` / `failed`.
 *
 * Sebelumnya fungsi ini mem-parse SSE dan menunggu event `result`; karena
 * backend tidak lagi mengirim SSE, hasil tidak pernah datang dan pemanggil
 * selalu mendapat "AI tidak mengembalikan hasil" padahal AI sudah selesai
 * (dan poin sudah terpotong).
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

  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const failFromBody = async (res: Response, fallback: string) => {
    const txt = await res.text().catch(() => '');
    // Backend membalas JSON { message, code } — tampilkan pesannya apa adanya,
    // terutama saat saldo AI Point habis (HTTP 402), bukan dump JSON mentah.
    let pesan = '';
    try {
      const j = JSON.parse(txt);
      pesan = String(j?.message ?? j?.errors?.web_store_id?.[0] ?? '');
    } catch {
      pesan = txt.slice(0, 200);
    }
    throw new Error(pesan || fallback);
  };

  onStatus?.('thinking', 'AI membaca toko & menyusun saran…');

  const res = await fetch(`${backend}/api/ai/stream`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ input }),
    cache: 'no-store',
  });

  if (!res.ok) await failFromBody(res, `AI stream HTTP ${res.status}`);

  const queued = await res.json().catch(() => null);
  const jobId = String(queued?.job_id ?? '');
  if (!jobId) await failFromBody(res, 'AI tidak mengembalikan job. Coba lagi.');

  // Job timeout backend 200s (RunAiAssistantJob::$timeout). Beri margin lalu
  // berhenti, supaya UI tidak menggantung selamanya bila worker mati.
  const deadline = Date.now() + 210_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));

    const poll = await fetch(`${backend}/api/ai/job/${encodeURIComponent(jobId)}`, {
      headers: auth,
      cache: 'no-store',
    });
    if (!poll.ok) await failFromBody(poll, `AI job HTTP ${poll.status}`);

    const data = await poll.json().catch(() => null);
    const status = String(data?.status ?? '');

    if (status === 'done') {
      const result = data?.result as AiAssistantResult | undefined;
      if (!result) throw new Error('AI tidak mengembalikan hasil. Coba lagi.');
      return result;
    }
    if (status === 'failed') {
      throw new Error(String(data?.error ?? 'AI gagal merespons.'));
    }
    onStatus?.('thinking', 'AI mengetik…');
  }

  throw new Error('AI belum selesai setelah 3 menit. Coba lagi.');
}
