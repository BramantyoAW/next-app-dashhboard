'use client'

/**
 * useChat — placeholder hook untuk integrasi socket / API chat
 *
 * TODO:
 * - [ ] Koneksi WebSocket (Socket.io / native) untuk real-time messaging
 * - [ ] Fetch history pesan dari API saat mount
 * - [ ] Polling fallback jika WebSocket tidak tersedia
 * - [ ] Typing indicator dari merchant
 * - [ ] Read receipt / seen status
 * - [ ] Auto-reconnect WebSocket saat disconnect
 */
export function useChat({ merchantId, userId }: { merchantId: string; userId: string }) {
  // Placeholder state — akan diganti dengan real-time state dari WebSocket
  const [isConnected, setIsConnected] = useState(false)

  // TODO: Koneksi WebSocket ke baileys-service atau Laravel
  // useEffect(() => {
  //   const ws = new WebSocket(`ws://localhost:3001/ws/chat/${merchantId}?userId=${userId}`)
  //   ws.onopen = () => setIsConnected(true)
  //   ws.onclose = () => setIsConnected(false)
  //   return () => ws.close()
  // }, [merchantId, userId])

  /**
   * Kirim pesan via POST ke Laravel webhook
   * Endpoint: POST http://laravel:8000/api/whatsapp/webhook
   * Body: { merchantId, from: userId, text, channel: 'browser' }
   */
  const sendMessage = async (text: string): Promise<void> => {
    // TODO: Ganti dengan WebSocket send atau API call
    // const res = await fetch('http://localhost:8000/api/whatsapp/webhook', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ merchantId, from: userId, text, channel: 'browser' }),
    // })
    console.log(`[Chat] Sending to merchant ${merchantId}:`, text)
  }

  return { isConnected, sendMessage }
}