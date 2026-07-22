import { NextResponse } from 'next/server'
import { getWAService } from '@/lib/wa-service'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { phones, message, classId, recipientType, delayMs } = body

    if (!message) {
      return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 })
    }

    const waService = await getWAService()
    
    if (!waService.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp belum dikonfigurasi. Silakan atur API URL dan Session di Pengaturan Sistem.' 
      }, { status: 400 })
    }

    // Collect phone numbers based on recipient type
    let targetPhones: string[] = []

    if (phones && Array.isArray(phones) && phones.length > 0) {
      targetPhones = phones
    } else if (classId && recipientType) {
      // Auto-collect phones based on class and recipient type
      if (recipientType === 'parent') {
        const students = await db.student.findMany({
          where: { classId },
          include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } }
        })
        targetPhones = students
          .map(s => s.parentPhone || s.user?.phone)
          .filter((p): p is string => !!p)
      } else if (recipientType === 'student') {
        const students = await db.student.findMany({
          where: { classId },
          include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } }
        })
        targetPhones = students
          .map(s => s.user?.phone)
          .filter((p): p is string => !!p)
      } else if (recipientType === 'teacher') {
        const teachers = await db.teacher.findMany({
          include: { 
            user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
            subjectAssignments: { where: { classId } }
          }
        })
        targetPhones = teachers
          .filter(t => t.subjectAssignments.length > 0)
          .map(t => t.user?.phone)
          .filter((p): p is string => !!p)
      } else if (recipientType === 'all_parents') {
        const students = await db.student.findMany({
          include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } }
        })
        targetPhones = students
          .map(s => s.parentPhone || s.user?.phone)
          .filter((p): p is string => !!p)
      }
    }

    if (targetPhones.length === 0) {
      return NextResponse.json({ error: 'Tidak ada nomor telepon tujuan ditemukan' }, { status: 400 })
    }

    // Remove duplicates
    targetPhones = [...new Set(targetPhones)]

    const result = await waService.sendBlast({
      phones: targetPhones,
      message,
      delayMs: delayMs || 1500,
    })

    return NextResponse.json({
      success: true,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      totalTargets: targetPhones.length,
      results: result.results,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
