import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const loc = await db.attendanceLocation.findUnique({ where: { id }, include: { locationClasses: { include: { class: true } } } })
    if (!loc) return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 404 })
    return NextResponse.json(loc)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    await db.attendanceLocation.update({ where: { id }, data: { name: body.name, latitude: body.latitude, longitude: body.longitude, radius: body.radius } })
    if (body.classIds) {
      await db.locationClass.deleteMany({ where: { locationId: id } })
      for (const classId of body.classIds) {
        await db.locationClass.create({ data: { locationId: id, classId } })
      }
    }
    const result = await db.attendanceLocation.findUnique({ where: { id }, include: { locationClasses: { include: { class: true } } } })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.locationClass.deleteMany({ where: { locationId: id } })
    await db.attendanceLocation.delete({ where: { id } })
    return NextResponse.json({ message: 'Lokasi berhasil dihapus' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
