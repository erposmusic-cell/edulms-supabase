import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const att = await db.attendance.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } } },
    })
    if (!att) return NextResponse.json({ error: 'Absensi tidak ditemukan' }, { status: 404 })
    return NextResponse.json(att)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.timeIn !== undefined) data.timeIn = body.timeIn ? new Date(body.timeIn) : null
    if (body.timeOut !== undefined) data.timeOut = body.timeOut ? new Date(body.timeOut) : null
    if (body.notes !== undefined) data.notes = body.notes
    if (body.method !== undefined) data.method = body.method
    if (body.latitude !== undefined) data.latitude = body.latitude
    if (body.longitude !== undefined) data.longitude = body.longitude

    // GPS Geofence validation for clock-out
    if (body.method === 'gps' && body.latitude && body.longitude) {
      const existing = await db.attendance.findUnique({
        where: { id },
        include: { student: true },
      })
      if (existing?.student) {
        const { validateStudentLocation } = await import('@/lib/geofence')
        const geoResult = await validateStudentLocation(body.latitude, body.longitude, existing.student.classId)
        if (!geoResult.valid) {
          return NextResponse.json({
            error: geoResult.error || 'Anda berada di luar area absensi'
          }, { status: 400 })
        }
      }
    }

    const att = await db.attendance.update({ where: { id }, data, include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } } })
    return NextResponse.json(att)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.attendance.delete({ where: { id } })
    return NextResponse.json({ message: 'Absensi berhasil dihapus' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
