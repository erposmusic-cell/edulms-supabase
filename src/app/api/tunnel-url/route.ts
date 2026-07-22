import { NextResponse } from 'next/server'

/**
 * Public API - Returns the current Cloudflare tunnel URL
 * No authentication required - this is used by Blogspot to find EduLMS
 */
export async function GET() {
  try {
    const tunnelRes = await fetch('http://localhost:3000/api/tunnel')
    const tunnelData = await tunnelRes.json()

    if (tunnelData.status === 'running' && tunnelData.url) {
      return NextResponse.json({
        status: 'online',
        url: tunnelData.url,
        app: 'EduLMS',
        lastChecked: new Date().toISOString()
      })
    }

    return NextResponse.json({
      status: 'offline',
      url: null,
      app: 'EduLMS',
      message: 'Server sedang offline. Coba lagi dalam beberapa menit.',
      lastChecked: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({
      status: 'offline',
      url: null,
      app: 'EduLMS',
      message: 'Server sedang offline. Coba lagi dalam beberapa menit.',
      lastChecked: new Date().toISOString()
    })
  }
}
