import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * POST /api/push-tunnel-url
 * Admin-only endpoint to push the current tunnel URL to Google Apps Script
 * This keeps the Blogspot portal page updated with the latest URL
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengakses' }, { status: 403 })
    }

    const body = await request.json()
    const { url, appsScriptUrl, secretKey } = body

    if (!appsScriptUrl) {
      return NextResponse.json({ error: 'URL Google Apps Script belum dikonfigurasi' }, { status: 400 })
    }

    // Get current tunnel URL if not provided
    let tunnelUrl = url
    if (!tunnelUrl) {
      try {
        const tunnelRes = await fetch('http://localhost:3000/api/tunnel')
        const tunnelData = await tunnelRes.json()
        tunnelUrl = tunnelData.url || null
      } catch {
        return NextResponse.json({ error: 'Tunnel tidak aktif' }, { status: 400 })
      }
    }

    // Push to Google Apps Script
    const pushRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/plain' },
      body: JSON.stringify({
        secret: secretKey || 'edulms2026murdani',
        url: tunnelUrl
      }),
      redirect: 'follow'
    })

    const pushData = await pushRes.text()

    let result
    try {
      result = JSON.parse(pushData)
    } catch {
      result = { raw: pushData }
    }

    // Save configuration to settings
    await prisma.settings.upsert({
      where: { id: 'main' },
      update: {
        // @ts-ignore - dynamic fields
        blogspotAppsScriptUrl: appsScriptUrl,
        blogspotSecretKey: secretKey || 'edulms2026murdani',
        blogspotLastPush: new Date().toISOString(),
      },
      create: {
        id: 'main',
        schoolName: 'Sekolah',
        timeIn: '07:00',
        timeLate: '07:30',
        timeOutMin: '13:00',
        timeOutDeadline: '15:00',
        attendanceThreshold: 80,
        faceRecognitionThreshold: 0.6,
        reminderMinutes: 30,
        waEnabled: false,
        waApiUrl: 'https://waha.devlike.pro',
        waSession: 'default',
        emailEnabled: false,
        emailHost: 'smtp.gmail.com',
        emailPort: 587,
        emailSecure: false,
        emailFromName: 'EduLMS',
        // @ts-ignore
        blogspotAppsScriptUrl: appsScriptUrl,
        blogspotSecretKey: secretKey || 'edulms2026murdani',
        blogspotLastPush: new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      message: tunnelUrl
        ? `URL tunnel berhasil dikirim ke Blogspot: ${tunnelUrl}`
        : 'Status offline dikirim ke Blogspot',
      tunnelUrl,
      pushResult: result
    })

  } catch (error: any) {
    console.error('[PushTunnelUrl] Error:', error)
    return NextResponse.json({
      error: 'Gagal mengirim URL ke Blogspot',
      detail: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/push-tunnel-url
 * Returns the current Blogspot integration configuration
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengakses' }, { status: 403 })
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'main' } })

    // Get tunnel status
    let tunnelStatus = { status: 'unknown', url: null }
    try {
      const tunnelRes = await fetch('http://localhost:3000/api/tunnel')
      tunnelStatus = await tunnelRes.json()
    } catch {}

    return NextResponse.json({
      appsScriptUrl: (settings as any)?.blogspotAppsScriptUrl || '',
      secretKey: (settings as any)?.blogspotSecretKey || 'edulms2026murdani',
      lastPush: (settings as any)?.blogspotLastPush || null,
      autoPush: (settings as any)?.blogspotAutoPush || false,
      tunnelStatus: {
        status: tunnelStatus.status,
        url: tunnelStatus.url
      }
    })
  } catch (error: any) {
    console.error('[PushTunnelUrl] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
