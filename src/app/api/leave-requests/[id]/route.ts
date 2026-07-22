import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyLeaveRequest } from '@/lib/wa-notifier'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { status, approvedByWali, approvedByAdmin } = body

    // Check if status is actually changing
    const existing = await db.leaveRequest.findUnique({ where: { id } })
    const oldStatus = existing?.status

    const data: Record<string, unknown> = {}
    if (status) data.status = status
    if (approvedByWali !== undefined) data.approvedByWali = approvedByWali
    if (approvedByAdmin !== undefined) data.approvedByAdmin = approvedByAdmin

    const lr = await db.leaveRequest.update({
      where: { id },
      data,
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } },
    })

    // 🔔 Send real WhatsApp notification to parent when leave request status changes
    if (status && oldStatus !== status) {
      notifyLeaveRequest(lr.id, 'statusChanged').catch(err => {
        console.error('WA leave request status notification failed:', err)
      })
    }

    return NextResponse.json(lr)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
