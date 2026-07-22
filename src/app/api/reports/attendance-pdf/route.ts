import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
      return NextResponse.json({ error: 'Parameter tidak lengkap (classId, startDate, endDate)' }, { status: 400 })
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
      orderBy: [{ date: 'asc' }, { student: { user: { name: 'asc' } } }],
    })

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'
    const classData = await db.class.findUnique({ where: { id: classId } })

    // Use pdfmake with dynamic import
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default
    if (pdfFonts.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.pdfMake.vfs
    } else if ((pdfFonts as Record<string, unknown>).vfs) {
      pdfMake.vfs = (pdfFonts as Record<string, unknown>).vfs as Record<string, string>
    }

    // Count statuses
    const statusCount = {
      hadir: attendance.filter(a => a.status === 'hadir').length,
      terlambat: attendance.filter(a => a.status === 'terlambat').length,
      izin: attendance.filter(a => a.status === 'izin').length,
      sakit: attendance.filter(a => a.status === 'sakit').length,
      alpha: attendance.filter(a => a.status === 'alpha').length,
    }

    const statusLabel = (s: string) =>
      s === 'hadir' ? 'Hadir' : s === 'terlambat' ? 'Terlambat' : s === 'izin' ? 'Izin' : s === 'sakit' ? 'Sakit' : 'Alpha'

    const docDefinition = {
      pageSize: 'A4' as const,
      pageOrientation: 'landscape' as const,
      pageMargins: [30, 40, 30, 40] as [number, number, number, number],
      content: [
        { text: schoolName, style: 'header' },
        { text: `Laporan Kehadiran - Kelas ${classData?.name || '-'}`, style: 'subheader' },
        { text: `Periode: ${new Date(startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, style: 'subheader' },
        { text: '\n' },
        // Summary
        {
          columns: [
            { text: `Hadir: ${statusCount.hadir}`, style: 'statGreen' },
            { text: `Terlambat: ${statusCount.terlambat}`, style: 'statYellow' },
            { text: `Izin: ${statusCount.izin}`, style: 'statBlue' },
            { text: `Sakit: ${statusCount.sakit}`, style: 'statOrange' },
            { text: `Alpha: ${statusCount.alpha}`, style: 'statRed' },
          ],
          columnGap: 10,
        },
        { text: '\n' },
        // Table
        {
          table: {
            headerRows: 1,
            widths: [25, 120, 80, 60, 65, 55, '*'] as (string | number)[],
            body: [
              [
                { text: 'No', style: 'tableHeader' },
                { text: 'Nama Siswa', style: 'tableHeader' },
                { text: 'Tanggal', style: 'tableHeader' },
                { text: 'Jam Masuk', style: 'tableHeader' },
                { text: 'Jam Pulang', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' },
                { text: 'Metode', style: 'tableHeader' },
              ],
              ...attendance.map((a, i) => [
                String(i + 1),
                a.student?.user?.name || '-',
                new Date(a.date).toLocaleDateString('id-ID'),
                a.timeIn ? new Date(a.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                a.timeOut ? new Date(a.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                statusLabel(a.status),
                (a.method || '-').toUpperCase(),
              ]),
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? '#1a7f64' : rowIndex % 2 === 0 ? '#f5f5f5' : null,
            hLineColor: () => '#ddd',
            hLineWidth: () => 0.5,
            vLineColor: () => '#ddd',
            vLineWidth: () => 0.5,
          },
        },
        { text: '\n' },
        { text: `Dicetak pada: ${new Date().toLocaleString('id-ID')}`, style: 'footer' },
        { text: 'EduLMS - Sistem Manajemen Pembelajaran', style: 'footer' },
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center' as const, color: '#1a7f64' },
        subheader: { fontSize: 12, alignment: 'center' as const, margin: [0, 2] as [number, number], color: '#333' },
        tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#1a7f64' },
        statGreen: { fontSize: 10, color: '#16a34a', bold: true },
        statYellow: { fontSize: 10, color: '#ca8a04', bold: true },
        statBlue: { fontSize: 10, color: '#2563eb', bold: true },
        statOrange: { fontSize: 10, color: '#ea580c', bold: true },
        statRed: { fontSize: 10, color: '#dc2626', bold: true },
        footer: { fontSize: 8, color: '#888', italics: true },
      },
      defaultStyle: { fontSize: 9 },
    }

    return new Promise<Response>((resolve) => {
      const pdfDoc = pdfMake.createPdf(docDefinition)
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="laporan-kehadiran-${classData?.name || 'class'}-${startDate}-${endDate}.pdf"`,
          },
        }))
      })
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Gagal membuat PDF: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}
