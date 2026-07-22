import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyBulkAttendance } from '@/lib/wa-notifier'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { action, attendanceIds, status, notes, academicYearId, date, studentIds, createdBy } = body

    if (action === 'updateStatus' && attendanceIds && status) {
      // Batch update instead of loop
      const data: Record<string, unknown> = { status }
      if (notes) data.notes = notes

      await db.attendance.updateMany({
        where: { id: { in: attendanceIds } },
        data,
      })

      // Single findMany to get updated records for WA notification
      const updated = await db.attendance.findMany({
        where: { id: { in: attendanceIds } },
        include: { student: { include: { class: true } } },
      })

      // Send WA notifications for non-hadir statuses
      const attendanceRecords = updated.map(u => ({
        studentId: u.studentId,
        status: u.status,
        date: u.date.toISOString(),
        timeIn: u.timeIn?.toISOString(),
      }))
      notifyBulkAttendance(attendanceRecords).catch(err => {
        console.error('WA bulk attendance notification failed:', err)
      })

      return NextResponse.json({ updated: updated.length })
    }

    if (action === 'markAll' && studentIds && academicYearId && date && status) {
      const dateObj = new Date(date)

      // Single findMany to check existing records
      const existing = await db.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          date: dateObj,
        },
        select: { studentId: true },
      })
      const existingStudentIds = new Set(existing.map(e => e.studentId))

      // Filter to only students without existing records
      const newStudentIds = studentIds.filter((id: string) => !existingStudentIds.has(id))

      if (newStudentIds.length > 0) {
        // Batch create with createMany instead of loop
        await db.attendance.createMany({
          data: newStudentIds.map((studentId: string) => ({
            studentId,
            academicYearId,
            date: dateObj,
            status,
            notes: notes || null,
            createdBy: createdBy || null,
          })),
        })
      }

      // Send WA notifications
      const attendanceRecords = newStudentIds.map((studentId: string) => ({
        studentId,
        status,
        date,
      }))
      notifyBulkAttendance(attendanceRecords).catch(err => {
        console.error('WA bulk attendance notification failed:', err)
      })

      return NextResponse.json({ created: newStudentIds.length })
    }

    if (action === 'deleteAll' && attendanceIds) {
      const result = await db.attendance.deleteMany({ where: { id: { in: attendanceIds } } })
      return NextResponse.json({ deleted: result.count })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Bulk attendance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
