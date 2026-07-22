import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const student = await db.student.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } })
    if (!student) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })

    const attendance = await db.attendance.findMany({
      where: { studentId: id },
      include: { academicYear: true },
      orderBy: { date: 'desc' },
      take: 30,
    })

    const leaveRequests = await db.leaveRequest.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    })

    const totalDays = attendance.length
    const hadir = attendance.filter(a => a.status === 'hadir').length
    const terlambat = attendance.filter(a => a.status === 'terlambat').length
    const izin = attendance.filter(a => a.status === 'izin').length
    const sakit = attendance.filter(a => a.status === 'sakit').length
    const alpha = attendance.filter(a => a.status === 'alpha').length
    const attendanceRate = totalDays > 0 ? ((hadir + terlambat) / totalDays * 100) : 0

    return NextResponse.json({
      student,
      attendance,
      leaveRequests,
      stats: { totalDays, hadir, terlambat, izin, sakit, alpha, attendanceRate: Math.round(attendanceRate * 10) / 10 },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
