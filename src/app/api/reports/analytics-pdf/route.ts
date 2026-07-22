import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    // Fetch analytics data with optimized queries
    const classes = await db.class.findMany({
      include: {
        students: {
          include: {
            grades: { select: { score: true } },
            attendance: { select: { status: true } },
          },
        },
      },
    })

    const studentPerformance = classes.map(cls => {
      const allGrades = cls.students.flatMap(s => s.grades.map(g => g.score))
      const avgGrade = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0
      return { name: cls.name, avgGrade: Math.round(avgGrade * 10) / 10, studentCount: cls.students.length }
    })

    const attendanceRate = classes.map(cls => {
      const allAttendance = cls.students.flatMap(s => s.attendance)
      const total = allAttendance.length
      const hadir = allAttendance.filter(a => a.status === 'hadir').length
      const terlambat = allAttendance.filter(a => a.status === 'terlambat').length
      const izin = allAttendance.filter(a => a.status === 'izin').length
      const sakit = allAttendance.filter(a => a.status === 'sakit').length
      const alpha = allAttendance.filter(a => a.status === 'alpha').length
      return { name: cls.name, rate: total > 0 ? Math.round((hadir / total) * 100) : 0, total, hadir, terlambat, izin, sakit, alpha }
    })

    const totalStudents = await db.student.count()
    const totalTeachers = await db.teacher.count()
    const totalBooks = await db.libraryBook.count()
    const totalAnnouncements = await db.announcement.count({ where: { isPublished: true } })

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 40, bottom: 40, left: 30, right: 30 },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Helper function to draw a table
    function drawTable(
      doc: InstanceType<typeof import('pdfkit').default>,
      x: number,
      y: number,
      headers: string[],
      rows: string[][],
      colWidths: number[],
      options?: { headerColor?: string; fontSize?: number; rowHeight?: number }
    ) {
      const opts = { headerColor: '#1a7f64', fontSize: 8, rowHeight: 16, ...options }
      let currentY = y

      // Draw header
      let currentX = x
      for (let i = 0; i < headers.length; i++) {
        doc.save()
        doc.rect(currentX, currentY, colWidths[i], opts.rowHeight + 4).fill(opts.headerColor)
        doc.fillColor('white').fontSize(opts.fontSize).font('Helvetica-Bold')
        doc.text(headers[i], currentX + 4, currentY + 3, { width: colWidths[i] - 8, align: 'center' })
        doc.restore()
        currentX += colWidths[i]
      }
      currentY += opts.rowHeight + 4

      // Draw rows
      for (const row of rows) {
        currentX = x
        for (let i = 0; i < row.length; i++) {
          doc.save()
          doc.rect(currentX, currentY, colWidths[i], opts.rowHeight).fillAndStroke('#ffffff', '#e5e7eb')
          doc.fillColor('#333333').fontSize(opts.fontSize).font('Helvetica')
          doc.text(row[i], currentX + 4, currentY + 2, { width: colWidths[i] - 8, align: i === 0 ? 'center' : 'left' })
          doc.restore()
          currentX += colWidths[i]
        }
        currentY += opts.rowHeight

        if (currentY > 750) {
          doc.addPage({ size: 'A4', layout: 'portrait' })
          currentY = 40
        }
      }

      return currentY
    }

    // Title
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a7f64')
    doc.text(schoolName, { align: 'center' })
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333')
    doc.text('Laporan Analitik Sekolah', { align: 'center' })
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' })
    doc.moveDown(1.5)

    // Overview
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a7f64')
    doc.text('Ringkasan Umum')
    doc.moveDown(0.5)

    const overviewData = [
      [`Total Siswa: ${totalStudents}`, `Total Guru: ${totalTeachers}`],
      [`Total Buku: ${totalBooks}`, `Total Pengumuman: ${totalAnnouncements}`],
    ]

    const boxW = 255
    let overviewY = doc.y
    for (const row of overviewData) {
      for (let i = 0; i < row.length; i++) {
        const x = 30 + i * (boxW + 10)
        doc.rect(x, overviewY, boxW, 22).fillAndStroke('#f9fafb', '#e5e7eb')
        doc.fillColor('#333333').fontSize(10).font('Helvetica')
        doc.text(row[i], x + 10, overviewY + 5)
      }
      overviewY += 26
    }
    doc.y = overviewY + 10

    // Student Performance
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a7f64')
    doc.text('Performa Siswa per Kelas')
    doc.moveDown(0.5)

    const perfHeaders = ['Kelas', 'Jml Siswa', 'Rata-rata', 'Status']
    const perfColWidths = [200, 80, 80, 80]
    const perfRows = studentPerformance.map(p => [
      p.name,
      String(p.studentCount),
      String(p.avgGrade),
      p.avgGrade >= 75 ? 'Baik' : p.avgGrade >= 60 ? 'Cukup' : 'Kurang',
    ])

    doc.y = drawTable(doc, 30, doc.y, perfHeaders, perfRows, perfColWidths) + 10

    // Attendance Rate
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a7f64')
    doc.text('Tingkat Kehadiran per Kelas')
    doc.moveDown(0.5)

    const attHeaders = ['Kelas', 'Hadir', 'Terlambat', 'Izin/Sakit', 'Alpha', '% Hadir']
    const attColWidths = [130, 55, 65, 65, 55, 65]
    const attRows = attendanceRate.map(a => [
      a.name,
      String(a.hadir),
      String(a.terlambat),
      String(a.izin + a.sakit),
      String(a.alpha),
      `${a.rate}%`,
    ])

    doc.y = drawTable(doc, 30, doc.y, attHeaders, attRows, attColWidths) + 10

    // Footer
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#9ca3af')
    doc.text('Laporan ini dihasilkan secara otomatis oleh sistem EduLMS.', { align: 'center' })

    return new Promise<Response>((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(new Response(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="laporan-analitik-${new Date().toISOString().split('T')[0]}.pdf"`,
          },
        }))
      })
      doc.end()
    })
  } catch (error) {
    console.error('PDF analytics generation error:', error)
    return NextResponse.json({ error: 'Gagal membuat PDF' }, { status: 500 })
  }
}
