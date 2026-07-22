import { NextResponse } from 'next/server'
import { getWAService } from '@/lib/wa-service'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { phone, message, mediaUrl, mediaType, fileName, caption } = body

    if (!phone || !message) {
      return NextResponse.json({ error: 'Nomor telepon dan pesan wajib diisi' }, { status: 400 })
    }

    const waService = await getWAService()
    
    if (!waService.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp belum dikonfigurasi. Silakan atur API URL dan Session di Pengaturan Sistem.' 
      }, { status: 400 })
    }

    const result = await waService.sendMessage({
      phone,
      message,
      mediaUrl,
      mediaType,
      fileName,
      caption,
    })

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message, data: result.data })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
