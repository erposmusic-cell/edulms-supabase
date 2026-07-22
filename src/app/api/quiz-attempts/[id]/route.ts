import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

function gradeAnswer(question: { type: string; correctAnswer: string | null; points: number }, studentAnswer: string | null): { isCorrect: boolean | null; pointsEarned: number } {
  if (!studentAnswer && question.type !== 'essay') {
    return { isCorrect: false, pointsEarned: 0 }
  }

  switch (question.type) {
    case 'multiple_choice': {
      const isCorrect = studentAnswer === question.correctAnswer
      return { isCorrect, pointsEarned: isCorrect ? question.points : 0 }
    }

    case 'benar_salah': {
      if (!question.correctAnswer) return { isCorrect: false, pointsEarned: 0 }
      try {
        const correct = JSON.parse(question.correctAnswer)
        const student = JSON.parse(studentAnswer!)
        const correctAnswers = correct.answers || []
        let correctCount = 0
        const totalStatements = correctAnswers.length
        for (let i = 0; i < totalStatements; i++) {
          if (student[String(i + 1)] === correctAnswers[i]) {
            correctCount++
          }
        }
        const ratio = totalStatements > 0 ? correctCount / totalStatements : 0
        const pointsEarned = Math.round(ratio * question.points * 100) / 100
        const isCorrect = ratio === 1
        return { isCorrect, pointsEarned }
      } catch {
        return { isCorrect: false, pointsEarned: 0 }
      }
    }

    case 'mcma': {
      if (!question.correctAnswer) return { isCorrect: false, pointsEarned: 0 }
      try {
        const correct = JSON.parse(question.correctAnswer) as string[]
        const student = JSON.parse(studentAnswer!) as string[]
        const correctSet = new Set(correct)
        const studentSet = new Set(student)

        let correctSelections = 0
        for (const s of student) {
          if (correctSet.has(s)) correctSelections++
        }

        const isFullyCorrect = correctSet.size === studentSet.size &&
          [...correctSet].every(c => studentSet.has(c))

        if (isFullyCorrect) {
          return { isCorrect: true, pointsEarned: question.points }
        }

        const wrongSelections = student.filter(s => !correctSet.has(s)).length
        const partialScore = Math.max(0, question.points * (correctSelections / correctSet.size) - (wrongSelections * question.points * 0.25))
        return { isCorrect: false, pointsEarned: Math.round(partialScore * 100) / 100 }
      } catch {
        return { isCorrect: false, pointsEarned: 0 }
      }
    }

    case 'essay': {
      return { isCorrect: null, pointsEarned: 0 }
    }

    default:
      return { isCorrect: false, pointsEarned: 0 }
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const attempt = await db.quizAttempt.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            questions: { orderBy: { orderNum: 'asc' } },
          },
        },
        student: { include: { user: { select: { id: true, name: true } } } },
        answers: { include: { question: true } },
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Percobaan quiz tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(attempt)
  } catch (error) {
    console.error('Quiz attempt GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data percobaan' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { answers, status, timeSpent, cheatData, action, readmitBy } = body

    // Handle re-admit action
    if (action === 'readmit') {
      const attempt = await db.quizAttempt.findUnique({
        where: { id },
        include: {
          student: { include: { user: { select: { id: true, name: true } } } },
          quiz: { select: { id: true, title: true, maxAttempts: true } },
        },
      })

      if (!attempt) {
        return NextResponse.json({ error: 'Percobaan ujian tidak ditemukan' }, { status: 404 })
      }

      if (!['cheat_detected', 'timed_out', 'completed'].includes(attempt.status)) {
        return NextResponse.json({ error: 'Hanya percobaan yang sudah selesai, waktu habis, atau terdeteksi kecurangan yang dapat diizinkan ulang' }, { status: 400 })
      }

      const inProgress = await db.quizAttempt.findFirst({
        where: { quizId: attempt.quizId, studentId: attempt.studentId, status: 'in_progress' },
      })

      if (inProgress) {
        return NextResponse.json({ error: 'Siswa masih memiliki percobaan yang sedang berlangsung' }, { status: 400 })
      }

      const existingLog = (() => { try { return JSON.parse(attempt.cheatLog || '[]') } catch { return [] } })()
      const updatedAttempt = await db.quizAttempt.update({
        where: { id },
        data: {
          status: 'disqualified',
          cheatLog: JSON.stringify([
            ...existingLog,
            `Re-admitted by ${readmitBy || 'admin'} at ${new Date().toISOString()}`
          ]),
        },
      })

      if (readmitBy) {
        try {
          await db.activityLog.create({
            data: {
              userId: readmitBy,
              userName: '',
              userRole: 'teacher',
              action: 'READMIT_STUDENT_EXAM',
              details: `Siswa ${attempt.student?.user?.name || attempt.studentId} diizinkan mengerjakan ulang ujian "${attempt.quiz?.title || attempt.quizId}"`,
            },
          })
        } catch { /* non-critical */ }
      }

      return NextResponse.json({
        message: `Siswa ${attempt.student?.user?.name || ''} berhasil diizinkan mengerjakan ulang ujian`,
        attempt: updatedAttempt,
      })
    }

    const attempt = await db.quizAttempt.findUnique({
      where: { id },
      include: { quiz: { include: { questions: true } } },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Percobaan quiz tidak ditemukan' }, { status: 404 })
    }

    // Update anti-cheat data if provided
    if (cheatData) {
      await db.quizAttempt.update({
        where: { id },
        data: {
          tabSwitches: cheatData.tabSwitches ?? undefined,
          copyAttempts: cheatData.copyAttempts ?? undefined,
          pasteAttempts: cheatData.pasteAttempts ?? undefined,
          rightClicks: cheatData.rightClicks ?? undefined,
          fullscreenExited: cheatData.fullscreenExited ?? undefined,
          cheatLog: cheatData.cheatLog ? JSON.stringify(cheatData.cheatLog) : undefined,
        },
      })
    }

    // Process answers and calculate score
    if (answers && Array.isArray(answers)) {
      // Delete existing answers
      await db.quizAnswer.deleteMany({ where: { attemptId: id } })

      let totalPoints = 0
      let maxPoints = 0

      // Calculate grades in JS, then batch insert with createMany
      const answersToCreate: Array<{ attemptId: string; questionId: string; answer: string | null; isCorrect: boolean | null; pointsEarned: number }> = []

      for (const ans of answers) {
        const question = attempt.quiz.questions.find((q: { id: string }) => q.id === ans.questionId)
        if (question) {
          maxPoints += question.points
          const result = gradeAnswer(question, ans.answer || null)
          totalPoints += result.pointsEarned

          answersToCreate.push({
            attemptId: id,
            questionId: ans.questionId,
            answer: ans.answer || null,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
          })
        }
      }

      // Batch insert all answers at once instead of loop
      if (answersToCreate.length > 0) {
        await db.quizAnswer.createMany({ data: answersToCreate })
      }

      const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0
      const finalStatus = status || 'completed'

      const updatedAttempt = await db.quizAttempt.update({
        where: { id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          timeSpent: timeSpent || null,
          score,
          ...(cheatData ? {
            tabSwitches: cheatData.tabSwitches ?? 0,
            copyAttempts: cheatData.copyAttempts ?? 0,
            pasteAttempts: cheatData.pasteAttempts ?? 0,
            rightClicks: cheatData.rightClicks ?? 0,
            fullscreenExited: cheatData.fullscreenExited ?? 0,
            cheatLog: cheatData.cheatLog ? JSON.stringify(cheatData.cheatLog) : null,
          } : {}),
        },
        include: {
          quiz: true,
          student: { include: { user: { select: { id: true, name: true } } } },
          answers: { include: { question: true } },
        },
      })

      return NextResponse.json(updatedAttempt)
    }

    // Just update status or timeSpent or cheat data
    const updatedAttempt = await db.quizAttempt.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(timeSpent !== undefined && { timeSpent }),
        ...(status === 'completed' || status === 'timed_out' || status === 'cheat_detected' ? { completedAt: new Date() } : {}),
        ...(cheatData ? {
          tabSwitches: cheatData.tabSwitches ?? 0,
          copyAttempts: cheatData.copyAttempts ?? 0,
          pasteAttempts: cheatData.pasteAttempts ?? 0,
          rightClicks: cheatData.rightClicks ?? 0,
          fullscreenExited: cheatData.fullscreenExited ?? 0,
          cheatLog: cheatData.cheatLog ? JSON.stringify(cheatData.cheatLog) : null,
        } : {}),
      },
      include: {
        quiz: true,
        student: { include: { user: { select: { id: true, name: true } } } },
        answers: { include: { question: true } },
      },
    })

    return NextResponse.json(updatedAttempt)
  } catch (error) {
    console.error('Quiz attempt PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate percobaan quiz' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    // Delete answers first
    await db.quizAnswer.deleteMany({ where: { attemptId: id } })
    // Then delete the attempt
    await db.quizAttempt.delete({ where: { id } })

    return NextResponse.json({ message: 'Percobaan berhasil dihapus' })
  } catch (error) {
    console.error('Quiz attempt DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus percobaan quiz' }, { status: 500 })
  }
}
