import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import mammoth from 'mammoth'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

interface ParsedQuestion {
  type: 'multiple_choice' | 'benar_salah' | 'mcma' | 'essay'
  question: string
  options?: string | null
  correctAnswer?: string | null
  points: number
}

function parseDocxContent(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  let currentType: string | null = null
  let currentQuestion: Partial<ParsedQuestion> = {}
  let currentOptions: string[] = []
  let currentBsAnswer: number[] = []

  const saveCurrentQuestion = () => {
    if (currentType && currentQuestion.question) {
      const q: ParsedQuestion = {
        type: currentType as ParsedQuestion['type'],
        question: currentQuestion.question || '',
        options: currentQuestion.options || null,
        correctAnswer: currentQuestion.correctAnswer || null,
        points: currentQuestion.points || 1,
      }

      // For MC type, store options as JSON array
      if (currentType === 'multiple_choice' && currentOptions.length > 0) {
        q.options = JSON.stringify(currentOptions)
      }

      // For MCMA, store options in {options:[...]} format
      if (currentType === 'mcma' && currentOptions.length > 0) {
        q.options = JSON.stringify({ options: currentOptions })
      }

      // For B/S, store statements and answers
      if (currentType === 'benar_salah') {
        q.options = JSON.stringify({ statements: currentOptions.length > 0 ? currentOptions : [currentQuestion.question] })
        q.correctAnswer = JSON.stringify({ answers: currentBsAnswer.length > 0 ? currentBsAnswer : [0] })
        // For B/S, the question is actually the statement, adjust
        if (currentOptions.length === 0) {
          q.question = currentQuestion.question
        }
      }

      questions.push(q)
    }
    currentType = null
    currentQuestion = {}
    currentOptions = []
    currentBsAnswer = []
  }

  for (const line of lines) {
    // Check for section markers
    if (line.startsWith('[PILIHAN GANDA]')) {
      if (currentType) saveCurrentQuestion()
      currentType = 'multiple_choice'
      continue
    } else if (line.startsWith('[BENAR/SALAH]')) {
      if (currentType) saveCurrentQuestion()
      currentType = 'benar_salah'
      continue
    } else if (line.startsWith('[MCMA]')) {
      if (currentType) saveCurrentQuestion()
      currentType = 'mcma'
      continue
    } else if (line.startsWith('[ESAI]') || line.startsWith('[ESAY]')) {
      if (currentType) saveCurrentQuestion()
      currentType = 'essay'
      continue
    }

    if (!currentType) continue

    // Parse fields
    const soalMatch = line.match(/^Soal:\s*(.+)/i)
    const pernyataanMatch = line.match(/^Pernyataan:\s*(.+)/i)
    const jawabanMatch = line.match(/^Jawaban:\s*(.+)/i)
    const poinMatch = line.match(/^Poin:\s*(\d+)/i)
    const optionMatch = line.match(/^([A-F])\.\s*(.+)/i)

    if (soalMatch) {
      // If we already have a question for this type, save it and start new
      if (currentQuestion.question && (currentType === 'multiple_choice' || currentType === 'mcma' || currentType === 'essay')) {
        const savedType = currentType // preserve type before saveCurrentQuestion resets it
        saveCurrentQuestion()
        currentType = savedType // restore type for the new question
      }
      currentQuestion.question = soalMatch[1].trim()
    } else if (pernyataanMatch) {
      // B/S: statement line
      if (currentType === 'benar_salah') {
        // If we already have a B/S question with a Jawaban, save it and start new
        if (currentQuestion.question && currentBsAnswer.length > 0 && currentOptions.length > 0) {
          const savedType = currentType
          saveCurrentQuestion()
          currentType = savedType
        }
        currentOptions.push(pernyataanMatch[1].trim())
        // If this is the first statement, also set the question field
        if (!currentQuestion.question) {
          currentQuestion.question = 'Pernyataan Benar/Salah'
        }
      }
    } else if (jawabanMatch) {
      const answer = jawabanMatch[1].trim()
      if (currentType === 'multiple_choice') {
        currentQuestion.correctAnswer = answer.toUpperCase()
      } else if (currentType === 'benar_salah') {
        // B or S - could be multiple answers separated by comma for multi-statement
        const answerParts = answer.split(',').map(a => a.trim().toUpperCase())
        for (const part of answerParts) {
          const bsVal = part === 'B' ? 1 : 0
          currentBsAnswer.push(bsVal)
        }
      } else if (currentType === 'mcma') {
        // A, D format
        const letters = answer.split(',').map(l => l.trim().toUpperCase()).filter(l => /^[A-F]$/.test(l))
        currentQuestion.correctAnswer = JSON.stringify(letters)
      }
    } else if (poinMatch) {
      currentQuestion.points = Number(poinMatch[1])
    } else if (optionMatch) {
      // Option line like A. Jakarta
      currentOptions.push(optionMatch[2].trim())
    }
  }

  // Save last question
  saveCurrentQuestion()

  return questions
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const quizId = formData.get('quizId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File DOCX wajib diunggah' }, { status: 400 })
    }
    if (!quizId) {
      return NextResponse.json({ error: 'ID Ujian wajib disertakan' }, { status: 400 })
    }

    // Verify quiz exists
    const quiz = await db.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) {
      return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 })
    }

    // Get existing questions count for orderNum
    const existingCount = await db.quizQuestion.count({ where: { quizId } })

    // Parse the DOCX file
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value

    // Parse questions from text
    const parsedQuestions = parseDocxContent(text)

    if (parsedQuestions.length === 0) {
      return NextResponse.json({ error: 'Tidak ada soal yang dapat diparsing dari file. Pastikan format sesuai template.' }, { status: 400 })
    }

    // Create questions in DB
    const createdQuestions: Record<string, unknown>[] = []
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i]
      const question = await db.quizQuestion.create({
        data: {
          quizId,
          question: q.question,
          type: q.type as string,
          options: q.options || null,
          correctAnswer: q.correctAnswer || null,
          points: q.points,
          orderNum: existingCount + i + 1,
        },
      })
      createdQuestions.push(question)
    }

    return NextResponse.json({
      message: `Berhasil mengimpor ${createdQuestions.length} soal`,
      imported: createdQuestions.length,
      questions: createdQuestions,
    }, { status: 201 })
  } catch (error) {
    console.error('Import DOCX error:', error)
    return NextResponse.json({ error: 'Gagal mengimpor file DOCX' }, { status: 500 })
  }
}
