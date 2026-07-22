import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const academicYearId = searchParams.get('academicYearId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (classId) where.student = { classId }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const attendance = await db.attendance.findMany({
      where,
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } }, academicYear: true },
      orderBy: { date: 'desc' },
    })

    const totalRecords = attendance.length
    const hadir = attendance.filter(a => a.status === 'hadir').length
    const terlambat = attendance.filter(a => a.status === 'terlambat').length
    const izin = attendance.filter(a => a.status === 'izin').length
    const sakit = attendance.filter(a => a.status === 'sakit').length
    const alpha = attendance.filter(a => a.status === 'alpha').length

    const byClass: Record<string, { name: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }> = {}
    for (const a of attendance) {
      const cn = a.student.class?.name || 'Unknown'
      if (!byClass[cn]) byClass[cn] = { name: cn, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0, total: 0 }
      byClass[cn].total++
      if (a.status === 'hadir') byClass[cn].hadir++
      else if (a.status === 'terlambat') byClass[cn].terlambat++
      else if (a.status === 'izin') byClass[cn].izin++
      else if (a.status === 'sakit') byClass[cn].sakit++
      else if (a.status === 'alpha') byClass[cn].alpha++
    }

    const dailyStats: Record<string, { date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }> = {}
    for (const a of attendance) {
      const d = new Date(a.date).toISOString().split('T')[0]
      if (!dailyStats[d]) dailyStats[d] = { date: d, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 }
      if (a.status === 'hadir') dailyStats[d].hadir++
      else if (a.status === 'terlambat') dailyStats[d].terlambat++
      else if (a.status === 'izin') dailyStats[d].izin++
      else if (a.status === 'sakit') dailyStats[d].sakit++
      else if (a.status === 'alpha') dailyStats[d].alpha++
    }

    return NextResponse.json({
      records: attendance,
      summary: { totalRecords, hadir, terlambat, izin, sakit, alpha },
      byClass: Object.values(byClass),
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
