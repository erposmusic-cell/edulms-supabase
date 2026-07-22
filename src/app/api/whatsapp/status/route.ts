import { NextResponse } from 'next/server'
import { getWAService } from '@/lib/wa-service'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    
    if (!settings?.waApiUrl) {
      return NextResponse.json({ 
        configured: false, 
        enabled: settings?.waEnabled || false,
        message: 'WhatsApp belum dikonfigurasi' 
      })
    }

    const waService = await getWAService()
    const sessionStatus = await waService.getSessionStatus()

    return NextResponse.json({
      configured: true,
      enabled: settings.waEnabled,
      apiUrl: settings.waApiUrl,
      session: settings.waSession || 'default',
      senderNumber: settings.waSenderNumber,
      autoAttendance: settings.waAutoAttendance,
      autoGrade: settings.waAutoGrade,
      autoAnnouncement: settings.waAutoAnnouncement,
      autoLeaveRequest: settings.waAutoLeaveRequest,
      ...sessionStatus,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
