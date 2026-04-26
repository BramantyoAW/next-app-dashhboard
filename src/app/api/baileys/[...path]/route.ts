import { NextRequest, NextResponse } from 'next/server'

const BAILEYS_URL = 'http://baileys-service:3001'

async function proxyFetch(url: string, init?: RequestInit) {
  try {
    console.log('[Proxy Request]:', url)
    const res = await fetch(url, { ...init, cache: 'no-store' })
    const text = await res.text()
    
    if (!text) {
      return new NextResponse(null, { status: res.status })
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      console.error('[Proxy JSON Error]:', err, 'Text:', text)
      return new NextResponse(text, {
        status: res.status,
        headers: { 'content-type': 'text/plain' },
      })
    }
  } catch (err) {
    console.error('[Proxy Fetch Error]:', err)
    return NextResponse.json({
      error: 'Proxy Fetch Error',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyFetch(`${BAILEYS_URL}/${path.join('/')}`)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  let body = {}
  try {
    const text = await req.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch (err) {
    console.error('[Proxy Body Error]:', err)
  }
  
  return proxyFetch(`${BAILEYS_URL}/${path.join('/')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyFetch(`${BAILEYS_URL}/${path.join('/')}`, { method: 'DELETE' })
}
