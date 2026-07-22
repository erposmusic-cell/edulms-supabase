import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!classId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Parameter tidak lengkap (classId, startDate, endDate diperlukan)' }, { status: 400 })
    }

    // Fetch attendance data
    const attendance = await db.attendance.findMany({
      where: {
        student: { classId },
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: {
        student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } },
      },
      orderBy: [{ date: 'asc' }, { student: { nis: 'asc' } }],
    })

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'
    const classData = await db.class.findUnique({ where: { id: classId } })

    const statusLabel = (s: string) => {
      switch (s) {
        case 'hadir': return 'Hadir'
        case 'terlambat': return 'Terlambat'
        case 'izin': return 'Izin'
        case 'sakit': return 'Sakit'
        case 'alpha': return 'Alpha'
        default: return s
      }
    }

    // Build Detail worksheet
    const detailHeader = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status', 'Metode', 'Catatan']
    const detailRows = attendance.map((a, i) => [
      i + 1,
      a.student?.nis || '-',
      a.student?.user?.name || '-',
      a.student?.class?.name || '-',
      new Date(a.date).toLocaleDateString('id-ID'),
      a.timeIn ? new Date(a.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      a.timeOut ? new Date(a.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      statusLabel(a.status),
      a.method || '-',
      a.notes || '-',
    ])
    const detailWsData = [
      [schoolName],
      [`Laporan Kehadiran - Kelas ${classData?.name || '-'}`],
      [`Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`],
      [],
      detailHeader,
      ...detailRows,
    ]
    const detailWs = XLSX.utils.aoa_to_sheet(detailWsData)
    detailWs['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ]
    // Merge school name row
    detailWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]

    // Build Summary worksheet - per student
    const studentMap = new Map<string, { name: string; nis: string; className: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }>()
    for (const a of attendance) {
      const key = a.studentId
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: a.student?.user?.name || '-',
          nis: a.student?.nis || '-',
          className: a.student?.class?.name || '-',
          hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0, total: 0,
        })
      }
      const s = studentMap.get(key)!
      s.total++
      if (a.status === 'hadir') s.hadir++
      else if (a.status === 'terlambat') s.terlambat++
      else if (a.status === 'izin') s.izin++
      else if (a.status === 'sakit') s.sakit++
      else if (a.status === 'alpha') s.alpha++
    }

    const summaryHeader = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha', 'Total', '% Kehadiran']
    const summaryRows = Array.from(studentMap.entries()).map(([_, s], i) => [
      i + 1, s.nis, s.name, s.className, s.hadir, s.terlambat, s.izin, s.sakit, s.alpha, s.total,
      s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(1) + '%' : '0%',
    ])
    const summaryWsData = [
      [schoolName],
      [`Ringkasan Kehadiran per Siswa - Kelas ${classData?.name || '-'}`],
      [`Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`],
      [],
      summaryHeader,
      ...summaryRows,
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryWsData)
    summaryWs['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 8 },
      { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    ]
    summaryWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, detailWs, 'Detail Kehadiran')
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan per Siswa')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="kehadiran-${classData?.name || 'class'}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Excel generation error:', error)
    return NextResponse.json({ error: 'Gagal membuat Excel' }, { status: 500 })
  }
}
