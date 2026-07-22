import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    // Export all data as JSON (works on both SQLite and Supabase/PostgreSQL)
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      data: {
        users: await db.user.findMany(),
        teachers: await db.teacher.findMany(),
        students: await db.student.findMany(),
        parents: await db.parent.findMany(),
        academicYears: await db.academicYear.findMany(),
        semesters: await db.semester.findMany(),
        classes: await db.class.findMany(),
        subjects: await db.subject.findMany(),
        subjectAssignments: await db.subjectAssignment.findMany(),
        classAdvisors: await db.classAdvisor.findMany(),
        schedules: await db.schedule.findMany(),
        materials: await db.material.findMany(),
        bookmarks: await db.bookmark.findMany(),
        studentNotes: await db.studentNote.findMany(),
        assignments: await db.assignment.findMany(),
        assignmentSubmissions: await db.assignmentSubmission.findMany(),
        quizzes: await db.quiz.findMany(),
        quizQuestions: await db.quizQuestion.findMany(),
        quizAttempts: await db.quizAttempt.findMany(),
        quizAnswers: await db.quizAnswer.findMany(),
        gradeCategories: await db.gradeCategory.findMany(),
        grades: await db.grade.findMany(),
        announcements: await db.announcement.findMany(),
        discussionForums: await db.discussionForum.findMany(),
        discussionPosts: await db.discussionPost.findMany(),
        attendance: await db.attendance.findMany(),
        leaveRequests: await db.leaveRequest.findMany(),
        qrCodes: await db.qRCode.findMany(),
        calendarEvents: await db.calendarEvent.findMany(),
        libraryBooks: await db.libraryBook.findMany(),
        libraryBookReviews: await db.libraryBookReview.findMany(),
        mediaItems: await db.mediaItem.findMany(),
        settings: await db.settings.findMany(),
        activityLogs: await db.activityLog.findMany(),
        studentAuditLogs: await db.studentAuditLog.findMany(),
        notifications: await db.notification.findMany(),
        holidays: await db.holiday.findMany(),
        reportSchedules: await db.reportSchedule.findMany(),
        reportScheduleLogs: await db.reportScheduleLog.findMany(),
        attendanceLocations: await db.attendanceLocation.findMany(),
        locationClasses: await db.locationClass.findMany(),
        chatRooms: await db.chatRoom.findMany(),
        chatMessages: await db.chatMessage.findMany(),
        chatParticipants: await db.chatParticipant.findMany(),
      }
    }

    const jsonStr = JSON.stringify(backup, null, 2)

    return new NextResponse(jsonStr, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="edulms-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Content-Length': Buffer.byteLength(jsonStr).toString(),
      },
    })
  } catch (error) {
    console.error('Backup database error:', error)
    return NextResponse.json({ error: 'Gagal backup database: ' + String(error) }, { status: 500 })
  }
}
