import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-guard'
import type { User, Teacher, Student, Subject, SubjectAssignment, GradeCategory, Assignment } from '@prisma/client'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    // Check if already seeded
    const existingAdmin = await db.user.findFirst({ where: { role: 'admin' } })
    if (existingAdmin) {
      return NextResponse.json({ message: 'Database sudah di-seed', seeded: false })
    }

    // Hash the default password
    const hashedPassword = await hashPassword('password123')

    // Create Admin
    const admin = await db.user.create({
      data: { email: 'admin@sekolah.id', password: hashedPassword, name: 'Administrator', role: 'admin', phone: '081234567890' },
    })

    // Create Teachers (store Teacher records, not just User records)
    const teacherRecords: Teacher[] = []
    const teacherData = [
      { email: 'budi@sekolah.id', name: 'Budi Santoso, S.Pd.', nip: '198501012010011001', specialization: 'Matematika', role: 'wali_kelas' },
      { email: 'siti@sekolah.id', name: 'Siti Rahayu, S.Pd.', nip: '198702152011012002', specialization: 'Bimbingan Konseling', role: 'guru_bk' },
      { email: 'dewi@sekolah.id', name: 'Dewi Lestari, M.Pd.', nip: '199003202012011003', specialization: 'IPA', role: 'teacher' },
      { email: 'ahmad.t@sekolah.id', name: 'Ahmad Hidayat, S.Kom.', nip: '198804102013011004', specialization: 'Informatika', role: 'teacher' },
    ]
    const teacherUsers: User[] = []
    for (const t of teacherData) {
      const user = await db.user.create({
        data: { email: t.email, password: hashedPassword, name: t.name, role: t.role, phone: '081234567800' },
      })
      const teacher = await db.teacher.create({
        data: { userId: user.id, nip: t.nip, specialization: t.specialization },
      })
      teacherRecords.push(teacher)
      teacherUsers.push(user)
    }

    // Create Student Users
    const studentUsers: User[] = []
    const studentData = [
      { email: 'ahmad.s@sekolah.id', name: 'Ahmad Fauzi' },
      { email: 'rina.s@sekolah.id', name: 'Rina Wati' },
      { email: 'dian.s@sekolah.id', name: 'Dian Permata' },
      { email: 'bambang.s@sekolah.id', name: 'Bambang Supriadi' },
      { email: 'maya.s@sekolah.id', name: 'Maya Anggraini' },
      { email: 'rio.s@sekolah.id', name: 'Rio Pratama' },
      { email: 'nita.s@sekolah.id', name: 'Nita Sari' },
      { email: 'fajar.s@sekolah.id', name: 'Fajar Nugroho' },
      { email: 'lisa.s@sekolah.id', name: 'Lisa Permata' },
      { email: 'yusuf.s@sekolah.id', name: 'Yusuf Ibrahim' },
    ]
    for (const s of studentData) {
      studentUsers.push(await db.user.create({
        data: { email: s.email, password: hashedPassword, name: s.name, role: 'student', phone: '081234567801' },
      }))
    }

    // Create Academic Year & Semester
    const ay = await db.academicYear.create({
      data: { name: '2025/2026', isActive: true, isArchived: false, startDate: new Date('2025-07-01'), endDate: new Date('2026-06-30') },
    })
    const semester1 = await db.semester.create({
      data: { name: 'Semester 1', academicYearId: ay.id, startDate: new Date('2025-07-01'), endDate: new Date('2025-12-31'), isActive: true },
    })
    await db.semester.create({
      data: { name: 'Semester 2', academicYearId: ay.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'), isActive: false },
    })

    // Create Classes
    const classXIPPLG = await db.class.create({
      data: { name: 'XI PPLG 1', major: 'PPLG', grade: '11', academicYearId: ay.id },
    })
    const classXIIT = await db.class.create({
      data: { name: 'XI TKJ 1', major: 'TKJ', grade: '11', academicYearId: ay.id },
    })
    const classXMIPA = await db.class.create({
      data: { name: 'X MIPA 1', major: 'MIPA', grade: '10', academicYearId: ay.id },
    })

    // Create Class Advisors (Wali Kelas assignments)
    await db.classAdvisor.create({
      data: { teacherId: teacherRecords[0].id, classId: classXIPPLG.id, academicYearId: ay.id },
    })
    await db.classAdvisor.create({
      data: { teacherId: teacherRecords[0].id, classId: classXIIT.id, academicYearId: ay.id },
    })

    // Create Students
    const students: Student[] = []
    const nisList = ['20250001', '20250002', '20250003', '20250004', '20250005', '20250006', '20250007', '20250008', '20250009', '20250010']
    const classMap = [classXIPPLG.id, classXIPPLG.id, classXIPPLG.id, classXIIT.id, classXIIT.id, classXIIT.id, classXMIPA.id, classXMIPA.id, classXMIPA.id, classXMIPA.id]
    for (let i = 0; i < studentUsers.length; i++) {
      students.push(await db.student.create({
        data: {
          userId: studentUsers[i].id,
          nis: nisList[i],
          parentPhone: '08123456780' + (i + 1),
          faceRegistered: i < 6,
          status: 'active',
          classId: classMap[i],
        },
      }))
    }

    // Create Parents
    const parentData = [
      { email: 'parent.ahmad@sekolah.id', name: 'H. Fauzi', childIndex: 0, relation: 'father' },
      { email: 'parent.rina@sekolah.id', name: 'Hj. Wati', childIndex: 1, relation: 'mother' },
      { email: 'parent.dian@sekolah.id', name: 'Bpk. Permata', childIndex: 2, relation: 'father' },
      { email: 'parent.bambang@sekolah.id', name: 'Ibu Supriadi', childIndex: 3, relation: 'mother' },
      { email: 'parent.maya@sekolah.id', name: 'Bpk. Anggraini', childIndex: 4, relation: 'father' },
    ]
    for (const p of parentData) {
      const user = await db.user.create({
        data: { email: p.email, password: hashedPassword, name: p.name, role: 'parent', phone: '081234567801' },
      })
      await db.parent.create({
        data: { userId: user.id, childId: students[p.childIndex].id, relation: p.relation },
      })
    }

    // Create Subjects
    const subjects: Subject[] = []
    const subjectData = [
      { name: 'Matematika', code: 'MTK' },
      { name: 'Bahasa Indonesia', code: 'BIN' },
      { name: 'IPA Fisika', code: 'FIS' },
      { name: 'Informatika', code: 'INF' },
      { name: 'Pendidikan Agama', code: 'PAI' },
      { name: 'Bahasa Inggris', code: 'BIG' },
      { name: 'Sejarah', code: 'SEJ' },
      { name: 'PJOK', code: 'PJO' },
    ]
    for (const s of subjectData) {
      subjects.push(await db.subject.create({
        data: { name: s.name, code: s.code, academicYearId: ay.id, description: `Mata pelajaran ${s.name}` },
      }))
    }

    // Create Subject Assignments
    const subjectAssignments: SubjectAssignment[] = []
    const classIds = [classXIPPLG.id, classXIIT.id, classXMIPA.id]
    for (let si = 0; si < 4; si++) {
      for (const classId of classIds) {
        subjectAssignments.push(await db.subjectAssignment.create({
          data: { subjectId: subjects[si].id, teacherId: teacherRecords[si].id, classId },
        }))
      }
    }

    // Create Schedules
    const timeSlots = ['07:00', '08:30', '10:00', '11:30', '13:00']
    for (const sa of subjectAssignments) {
      const day = (subjectAssignments.indexOf(sa) % 5) + 1
      const slotIdx = subjectAssignments.indexOf(sa) % timeSlots.length
      const startTime = timeSlots[slotIdx]
      const endHour = parseInt(startTime.split(':')[0]) + 1
      const endTime = `${endHour.toString().padStart(2, '0')}:30`
      await db.schedule.create({
        data: { classId: sa.classId, subjectAssignmentId: sa.id, dayOfWeek: day, startTime, endTime, room: `Ruang ${101 + subjectAssignments.indexOf(sa)}` },
      })
    }

    // Create Grade Categories
    const gradeCategories: GradeCategory[] = []
    for (const subject of subjects) {
      gradeCategories.push(await db.gradeCategory.create({ data: { subjectId: subject.id, name: 'Tugas', weight: 30 } }))
      gradeCategories.push(await db.gradeCategory.create({ data: { subjectId: subject.id, name: 'UTS', weight: 30 } }))
      gradeCategories.push(await db.gradeCategory.create({ data: { subjectId: subject.id, name: 'UAS', weight: 40 } }))
    }

    // Create Materials
    const materialData = [
      { title: 'Pengantar Limit Fungsi', type: 'document', topic: 'Limit' },
      { title: 'Teks Prosedur - Cara Membuat', type: 'document', topic: 'Teks Prosedur' },
      { title: 'Hukum Newton Gerak', type: 'video', topic: 'Dinamika' },
      { title: 'Algoritma Pencarian', type: 'presentation', topic: 'Algoritma' },
    ]
    for (let i = 0; i < materialData.length; i++) {
      await db.material.create({
        data: {
          subjectId: subjects[i].id,
          teacherId: teacherUsers[i].id,
          title: materialData[i].title,
          description: `Materi tentang ${materialData[i].topic}`,
          content: `<h1>${materialData[i].title}</h1><p>Konten materi ${materialData[i].topic}...</p>`,
          type: materialData[i].type,
          topic: materialData[i].topic,
          orderNum: i + 1,
          isPublished: true,
        },
      })
    }

    // Create Assignments
    const assignments: Assignment[] = []
    const assignmentData = [
      { title: 'Latihan Limit Fungsi', maxScore: 100, daysUntilDue: 7 },
      { title: 'Menulis Teks Prosedur', maxScore: 100, daysUntilDue: 5 },
      { title: 'Soal Hukum Newton', maxScore: 100, daysUntilDue: 10 },
      { title: 'Program Binary Search', maxScore: 100, daysUntilDue: 14 },
    ]
    for (let i = 0; i < assignmentData.length; i++) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + assignmentData[i].daysUntilDue)
      assignments.push(await db.assignment.create({
        data: {
          subjectId: subjects[i].id,
          teacherId: teacherUsers[i].id,
          title: assignmentData[i].title,
          description: `Kerjakan ${assignmentData[i].title} dengan baik`,
          instructions: `Instruksi untuk ${assignmentData[i].title}`,
          dueDate,
          maxScore: assignmentData[i].maxScore,
          gradeCategoryId: gradeCategories[i * 3]?.id,
          isPublished: true,
        },
      }))
    }

    // Create Assignment Submissions
    for (const assignment of assignments) {
      for (let si = 0; si < Math.min(5, students.length); si++) {
        const submitted = Math.random() > 0.3
        const graded = submitted && Math.random() > 0.5
        await db.assignmentSubmission.create({
          data: {
            assignmentId: assignment.id,
            studentId: students[si].id,
            textContent: submitted ? `Jawaban dari ${studentUsers[si].name}` : null,
            submittedAt: submitted ? new Date() : null,
            status: graded ? 'graded' : submitted ? 'submitted' : 'pending',
            score: graded ? Math.floor(70 + Math.random() * 30) : null,
            feedback: graded ? 'Bagus, pertahankan!' : null,
            gradedAt: graded ? new Date() : null,
          },
        })
      }
    }

    // Create Quizzes
    const quizData = [
      { title: 'Quiz Limit Fungsi', duration: 30, questions: 5 },
      { title: 'Quiz Teks Prosedur', duration: 20, questions: 5 },
      { title: 'Quiz Hukum Newton', duration: 25, questions: 5 },
      { title: 'Quiz Algoritma', duration: 30, questions: 5 },
    ]
    for (let i = 0; i < quizData.length; i++) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + i)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
      const quiz = await db.quiz.create({
        data: {
          subjectId: subjects[i].id,
          teacherId: teacherUsers[i].id,
          title: quizData[i].title,
          description: `Quiz tentang ${subjects[i].name}`,
          duration: quizData[i].duration,
          maxAttempts: 1,
          isPublished: true,
          startDate,
          endDate,
          gradeCategoryId: gradeCategories[i * 3 + 1]?.id,
        },
      })
      for (let q = 0; q < quizData[i].questions; q++) {
        await db.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: `Soal ${q + 1} - Pertanyaan tentang ${subjects[i].name}`,
            type: 'multiple_choice',
            options: JSON.stringify(['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']),
            correctAnswer: String(Math.floor(Math.random() * 4)),
            points: 20,
            orderNum: q + 1,
            explanation: `Penjelasan soal ${q + 1}`,
          },
        })
      }
    }

    // Create Quiz Attempts
    const quizzes = await db.quiz.findMany({ take: 4 })
    for (const quiz of quizzes) {
      for (let si = 0; si < Math.min(3, students.length); si++) {
        await db.quizAttempt.create({
          data: {
            quizId: quiz.id,
            studentId: students[si].id,
            score: Math.floor(60 + Math.random() * 40),
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            timeSpent: Math.floor(600 + Math.random() * 1200),
          },
        })
      }
    }

    // Create Grades
    for (const student of students.slice(0, 6)) {
      for (let ci = 0; ci < Math.min(6, gradeCategories.length); ci++) {
        await db.grade.create({
          data: {
            studentId: student.id,
            gradeCategoryId: gradeCategories[ci].id,
            semesterId: semester1.id,
            score: Math.floor(65 + Math.random() * 35),
            description: `Nilai ${gradeCategories[ci].name}`,
            date: new Date(),
          },
        })
      }
    }

    // Create Announcements
    await db.announcement.createMany({
      data: [
        { title: 'Selamat Datang di Semester 1', content: 'Selamat datang di semester 1 tahun ajaran 2025/2026. Semoga tahun ini lebih baik!', authorId: admin.id, priority: 'high', isPublished: true },
        { title: 'Jadwal UTS Semester 1', content: 'UTS akan dilaksanakan pada minggu ke-8. Silakan persiapkan diri dengan baik.', authorId: admin.id, priority: 'urgent', isPublished: true },
        { title: 'Perpustakaan Digital', content: 'Perpustakaan digital sudah bisa diakses. Manfaatkan untuk referensi tugas!', authorId: admin.id, priority: 'normal', isPublished: true },
        { title: 'Libur Nasional', content: 'Mengingatkan bahwa tanggal 17 Agustus adalah hari libur nasional.', authorId: admin.id, priority: 'normal', isPublished: true },
      ],
    })

    // Create Calendar Events
    await db.calendarEvent.createMany({
      data: [
        { title: 'UTS Semester 1', description: 'Ujian Tengah Semester', startDate: new Date('2025-10-06'), endDate: new Date('2025-10-11'), type: 'exam', createdBy: admin.id },
        { title: 'UAS Semester 1', description: 'Ujian Akhir Semester', startDate: new Date('2025-12-08'), endDate: new Date('2025-12-13'), type: 'exam', createdBy: admin.id },
        { title: 'Hari Kemerdekaan', description: 'Libur nasional', startDate: new Date('2025-08-17'), type: 'holiday', createdBy: admin.id },
        { title: 'Deadline Tugas Matematika', description: 'Pengumpulan tugas limit fungsi', startDate: new Date(Date.now() + 7 * 86400000), type: 'deadline', createdBy: admin.id },
      ],
    })

    // Create Attendance data for last 7 days
    const statuses = ['hadir', 'hadir', 'hadir', 'terlambat', 'izin', 'sakit', 'alpha']
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)
      date.setHours(0, 0, 0, 0)
      for (const student of students) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const timeIn = status !== 'alpha' ? new Date(date.getTime() + (status === 'terlambat' ? 8 * 3600000 : 7 * 3600000) + Math.random() * 1800000) : null
        await db.attendance.create({
          data: {
            studentId: student.id,
            academicYearId: ay.id,
            date,
            timeIn,
            status,
            method: status !== 'alpha' ? (Math.random() > 0.5 ? 'face' : 'manual') : null,
            notes: status === 'izin' ? 'Keperluan keluarga' : status === 'sakit' ? 'Demam' : null,
            createdBy: admin.id,
          },
        })
      }
    }

    // Create Settings
    await db.settings.create({
      data: {
        id: 'settings',
        schoolName: 'SMK Negeri 1 Jakarta',
        activeAcademicYearId: ay.id,
        timeIn: '07:00',
        timeLate: '07:30',
        timeOutMin: '13:00',
        timeOutDeadline: '16:00',
        attendanceThreshold: 80.0,
        faceRecognitionThreshold: 0.6,
        reminderMinutes: 30,
      },
    })

    // Create Holidays
    await db.holiday.createMany({
      data: [
        { name: 'Hari Kemerdekaan RI', date: new Date('2025-08-17') },
        { name: 'Hari Raya Idul Fitri', date: new Date('2025-03-31') },
        { name: 'Hari Raya Natal', date: new Date('2025-12-25') },
        { name: 'Tahun Baru', date: new Date('2026-01-01') },
      ],
    })

    // Create Library Books
    await db.libraryBook.createMany({
      data: [
        { title: 'Matematika Kelas XI', author: 'Tim Kemendikbud', category: 'Matematika', isbn: '978-602-1234-01', publisher: 'Kemendikbud', year: 2024, pages: 256, isAvailable: true },
        { title: 'Fisika Dasar', author: 'Halliday & Resnick', category: 'Fisika', isbn: '978-602-1234-02', publisher: 'Erlangga', year: 2023, pages: 896, isAvailable: true },
        { title: 'Algoritma & Pemrograman', author: 'Thomas Cormen', category: 'Informatika', isbn: '978-602-1234-03', publisher: 'Gramedia', year: 2024, pages: 1312, isAvailable: true },
        { title: 'Bahasa Indonesia SMA', author: 'Tim Kemendikbud', category: 'B. Indonesia', isbn: '978-602-1234-04', publisher: 'Kemendikbud', year: 2024, pages: 200, isAvailable: true },
      ],
    })

    // Create Activity Log
    await db.activityLog.create({
      data: { userId: admin.id, userName: admin.name, userRole: admin.role, action: 'SEED_DB', details: 'Database seeded with LMS demo data' },
    })

    return NextResponse.json({ message: 'Database berhasil di-seed dengan data demo LMS', seeded: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Gagal seed database: ' + String(error) }, { status: 500 })
  }
}
