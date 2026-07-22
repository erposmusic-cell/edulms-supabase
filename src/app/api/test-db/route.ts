import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const userCount = await db.user.count()
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const studentCount = await db.student.count()
    
    return NextResponse.json({
      status: 'OK',
      userCount,
      studentCount,
      hasSettings: !!settings,
      activeAcademicYearId: settings?.activeAcademicYearId || null,
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        DIRECT_URL_set: !!process.env.DIRECT_URL,
        NODE_ENV: process.env.NODE_ENV,
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      status: 'ERROR',
      error: message,
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        DIRECT_URL_set: !!process.env.DIRECT_URL,
        NODE_ENV: process.env.NODE_ENV,
      }
    }, { status: 500 })
  }
}