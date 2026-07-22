import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyLeaveRequest } from '@/lib/wa-notifier'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (studentId) where.studentId = studentId
    if (status) where.status = status

    const leaveRequests = await db.leaveRequest.findMany({
      where,
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(leaveRequests)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { studentId, type, reason, startDate, endDate, evidenceUrl } = body

    if (!studentId || !type || !reason || !startDate) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const lr = await db.leaveRequest.create({
      data: {
        studentId, type, reason,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        evidenceUrl: evidenceUrl || null,
        status: 'pending',
      },
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } },
    })

    // 🔔 Send real WhatsApp notification to wali kelas about new leave request
    notifyLeaveRequest(lr.id, 'created').catch(err => {
      console.error('WA leave request notification failed:', err)
    })

    return NextResponse.json(lr, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
