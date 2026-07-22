import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const locations = await db.attendanceLocation.findMany({
      include: { locationClasses: { include: { class: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(locations)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, latitude, longitude, radius, classIds } = body
    if (!name || latitude === undefined || longitude === undefined || !radius) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const location = await db.attendanceLocation.create({
      data: { name, latitude, longitude, radius },
    })
    if (classIds && Array.isArray(classIds)) {
      for (const classId of classIds) {
        await db.locationClass.create({ data: { locationId: location.id, classId } })
      }
    }
    const result = await db.attendanceLocation.findUnique({
      where: { id: location.id },
      include: { locationClasses: { include: { class: true } } },
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
