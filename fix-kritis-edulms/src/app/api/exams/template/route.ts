import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType } from 'docx'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'FORMAT SOAL UJIAN', bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: '=================', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Petunjuk: Isilah soal sesuai format di bawah. Gunakan penanda [TIPE SOAL] untuk memisahkan setiap soal.', italics: true, size: 20, color: '666666' }),
            ],
          }),

          // MULTIPLE CHOICE
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: '[PILIHAN GANDA]', bold: true, size: 26 }),
            ],
          }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Soal: Apa ibukota Indonesia?', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'A. Jakarta', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'B. Surabaya', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'C. Bandung', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'D. Medan', size: 22 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Jawaban: A', size: 22 })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Poin: 2', size: 22 })] }),

          // BENAR/SALAH
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: '[BENAR/SALAH]', bold: true, size: 26 }),
            ],
          }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Pernyataan: Indonesia terletak di benua Asia', size: 22 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Jawaban: B', size: 22 })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Poin: 1', size: 22 })] }),

          // MCMA
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: '[MCMA]', bold: true, size: 26 }),
            ],
          }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Soal: Pilih kota yang ada di Jawa Barat', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'A. Bandung', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'B. Jakarta', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'C. Surabaya', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'D. Bogor', size: 22 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: 'E. Semarang', size: 22 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Jawaban: A, D', size: 22 })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Poin: 3', size: 22 })] }),

          // ESSAY
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: '[ESAI]', bold: true, size: 26 }),
            ],
          }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Soal: Jelaskan proses terjadinya hujan!', size: 22 })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Poin: 5', size: 22 })] }),

          // SEPARATOR & ADDITIONAL INSTRUCTIONS
          new Paragraph({
            spacing: { before: 600 },
            children: [
              new TextRun({ text: '=================', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'KETENTUAN:', bold: true, size: 22 }),
            ],
          }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '1. Setiap soal harus dimulai dengan penanda tipe: [PILIHAN GANDA], [BENAR/SALAH], [MCMA], atau [ESAI]', size: 20 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '2. Untuk Pilihan Ganda: isi Soal, opsi A-D (bisa ditambah E/F), Jawaban (huruf), dan Poin', size: 20 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '3. Untuk Benar/Salah: isi Pernyataan, Jawaban (B=Benar, S=Salah), dan Poin', size: 20 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '4. Untuk MCMA: isi Soal, opsi A-E, Jawaban (huruf dipisah koma), dan Poin', size: 20 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '5. Untuk Esai: isi Soal dan Poin saja', size: 20 })] }),
          new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: '6. Setiap soal dipisahkan oleh penanda tipe soal baru', size: 20 })] }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8Array = new Uint8Array(buffer)

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="template-soal-ujian.docx"',
      },
    })
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Gagal membuat template DOCX' }, { status: 500 })
  }
}
