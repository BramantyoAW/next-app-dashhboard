"use client";

import { useEffect, useState } from "react";
import { getWaMessages } from "@/graphql/query/message/getMessage";
import { extractStoreId } from "@/lib/jwt";

type Message = {
  id: string;
  store_id: string;
  user_id: string | null;
  username: string | null;
  text_whatsapp: string;
  created_at: string;
};

export default function WhatsappMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (pageNum = 1) => {
    try {
      setLoading(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      if (!token) {
        console.warn("TOKEN KOSONG");
        return;
      }

      const storeId = extractStoreId(token);

      console.log("TOKEN =", token);
      console.log("STORE_ID =", storeId);

      if (!storeId) {
        console.warn("STORE ID TIDAK ADA DI JWT");
        return;
      }

      const res: any = await getWaMessages(
        token,
        Number(storeId),
        pageNum,
        10
      );

      console.log("WA RESULT ===>", res);

      setMessages(res.waMessagesByStore.data);
      setPagination(res.waMessagesByStore.pagination);
      setPage(pageNum);
    } catch (e) {
      console.error("ERR FETCH", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Whatsapp Messages</h2>

      {loading && <p>Loading...</p>}

      {/* GRID SELALU TAMPIL */}
      <div className="space-y-3">
        {messages.length === 0 && !loading && (
          <div className="border rounded-lg p-4 bg-white shadow-sm text-gray-500">
            No messages yet.
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className="border rounded-lg p-4 bg-white shadow-sm"
          >
            <div className="text-sm text-gray-400">
              {m.username || "Unknown User"} —{" "}
              {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="mt-2 font-medium">{m.text_whatsapp}</div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="flex items-center gap-4 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => fetchData(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {pagination.current_page} / {pagination.total_pages}
          </span>

          <button
            disabled={page >= pagination.total_pages}
            onClick={() => fetchData(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
