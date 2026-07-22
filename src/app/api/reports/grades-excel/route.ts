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
    const semesterId = searchParams.get('semesterId')

    if (!classId || !semesterId) {
      return NextResponse.json({ error: 'Parameter tidak lengkap (classId, semesterId)' }, { status: 400 })
    }

    // Get students in this class
    const students = await db.student.findMany({
      where: { classId },
      include: {
        user: { select: { name: true } },
        grades: {
          where: { semesterId },
          include: { gradeCategory: { include: { subject: true } } },
        },
      },
      orderBy: { nis: 'asc' },
    })

    // Get unique categories
    const categories = new Map<string, string>()
    students.forEach(s => {
      s.grades.forEach(g => {
        const key = g.gradeCategoryId
        if (!categories.has(key)) {
          categories.set(key, `${g.gradeCategory?.subject?.name || ''} - ${g.gradeCategory?.name || ''}`)
        }
      })
    })
    const categoryList = Array.from(categories.entries())

    // Build worksheet data
    const header = ['No', 'NIS', 'Nama Siswa', ...categoryList.map(([, name]) => name), 'Rata-rata']
    const rows = students.map((s, i) => {
      const gradeValues = categoryList.map(([catId]) => {
        const grade = s.grades.find(g => g.gradeCategoryId === catId)
        return grade ? String(grade.score) : '-'
      })
      const scores = gradeValues.filter(v => v !== '-').map(Number)
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
      return [String(i + 1), s.nis, s.user?.name || '-', ...gradeValues, avg]
    })

    const wsData = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = header.map((_, i) => ({ wch: i === 2 ? 25 : i === 0 ? 5 : 18 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa')

    // Summary sheet
    const summaryHeader = ['Statistik', ...categoryList.map(([, name]) => name)]
    const avgRow = ['Rata-rata', ...categoryList.map(([catId]) => {
      const scores = students.map(s => {
        const grade = s.grades.find(g => g.gradeCategoryId === catId)
        return grade ? grade.score : null
      }).filter((s): s is number => s !== null)
      return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-'
    })]
    const maxRow = ['Nilai Tertinggi', ...categoryList.map(([catId]) => {
      const scores = students.map(s => {
        const grade = s.grades.find(g => g.gradeCategoryId === catId)
        return grade ? grade.score : null
      }).filter((s): s is number => s !== null)
      return scores.length > 0 ? String(Math.max(...scores)) : '-'
    })]
    const minRow = ['Nilai Terendah', ...categoryList.map(([catId]) => {
      const scores = students.map(s => {
        const grade = s.grades.find(g => g.gradeCategoryId === catId)
        return grade ? grade.score : null
      }).filter((s): s is number => s !== null)
      return scores.length > 0 ? String(Math.min(...scores)) : '-'
    })]

    const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeader, avgRow, maxRow, minRow])
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="nilai-siswa.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Excel generation error:', error)
    return NextResponse.json({ error: 'Gagal membuat Excel' }, { status: 500 })
  }
}
