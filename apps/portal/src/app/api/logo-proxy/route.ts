import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['firebasestorage.googleapis.com', 'storage.googleapis.com']

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam) return new NextResponse('Missing url', { status: 400 })

  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlParam)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  if (!ALLOWED_HOSTS.some((h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const resp = await fetch(urlParam)
    if (!resp.ok) return new NextResponse('Upstream error', { status: resp.status })

    const contentType = resp.headers.get('content-type') ?? 'image/png'
    const buffer = await resp.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Error', { status: 500 })
  }
}
