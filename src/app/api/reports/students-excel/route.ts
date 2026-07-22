import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'
import type { ColInfo } from 'xlsx'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId

    const students = await db.student.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        class: { select: { name: true } },
      },
      orderBy: { nis: 'asc' },
    })

    // Students sheet
    const header = ['No', 'NIS', 'Nama', 'Email', 'Telepon', 'Telepon Orang Tua', 'Kelas', 'Status', 'Wajah Terdaftar']
    const rows = students.map((s, i) => [
      String(i + 1),
      s.nis,
      s.user?.name || '-',
      s.user?.email || '-',
      s.user?.phone || '-',
      s.parentPhone || '-',
      s.class?.name || '-',
      s.status === 'active' ? 'Aktif' : s.status,
      s.faceRegistered ? 'Ya' : 'Tidak',
    ])

    const wsData = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [5, 12, 25, 25, 15, 15, 15, 10, 14] as ColInfo[]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="data-siswa.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Students Excel error:', error)
    return NextResponse.json({ error: 'Gagal membuat Excel' }, { status: 500 })
  }
}
