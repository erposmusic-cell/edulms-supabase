'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'

// View imports
import AdminDashboard from '@/components/views/AdminDashboard'
import TeacherDashboard from '@/components/views/TeacherDashboard'
import StudentDashboard from '@/components/views/StudentDashboard'
import ParentDashboard from '@/components/views/ParentDashboard'
import WaliKelasDashboard from '@/components/views/WaliKelasDashboard'
import GuruBKDashboard from '@/components/views/GuruBKDashboard'
import ProfileAccount from '@/components/views/ProfileAccount'
import SubjectManagement from '@/components/views/SubjectManagement'
import MySubjects from '@/components/views/MySubjects'
import MaterialManagement from '@/components/views/MaterialManagement'
import TeacherManagement from '@/components/views/TeacherManagement'
import ScheduleManagement from '@/components/views/ScheduleManagement'
import AssignmentManagement from '@/components/views/AssignmentManagement'
import QuizManagement from '@/components/views/QuizManagement'
import GradeManagement from '@/components/views/GradeManagement'
import AnnouncementManagement from '@/components/views/AnnouncementManagement'
import DiscussionForum from '@/components/views/DiscussionForum'
import CalendarView from '@/components/views/CalendarView'
import DigitalLibrary from '@/components/views/DigitalLibrary'
import AttendanceView from '@/components/views/AttendanceView'
import ReportsAnalytics from '@/components/views/ReportsAnalytics'
import ClassManagement from '@/components/views/ClassManagement'
import StudentManagement from '@/components/views/StudentManagement'
import LeaveRequestManagement from '@/components/views/LeaveRequestManagement'
import AttendanceHistory from '@/components/views/AttendanceHistory'
import QRAttendance from '@/components/views/QRAttendance'
import StudentAttendance from '@/components/views/StudentAttendance'
import AcademicYearManagement from '@/components/views/AcademicYearManagement'
import SystemSettings from '@/components/views/SystemSettings'
import WAScheduleManagement from '@/components/views/WAScheduleManagement'
import WABlastManagement from '@/components/views/WABlastManagement'
import FaceRegistration from '@/components/views/FaceRegistration'
import FaceAttendance from '@/components/views/FaceAttendance'
import LocationSettings from '@/components/views/LocationSettings'
import ExamManagement from '@/components/views/ExamManagement'

// Map URL slug to view ID (handles normalization like leaveRequests -> leave-requests)
const slugToViewId: Record<string, string> = {
  dashboard: 'dashboard',
  subjects: 'subjects',
  classes: 'classes',
  teachers: 'teachers',
  students: 'students',
  schedules: 'schedules',
  materials: 'materials',
  assignments: 'assignments',
  quizzes: 'quizzes',
  exams: 'exams',
  grades: 'grades',
  attendance: 'attendance',
  'face-registration': 'face-registration',
  'location-settings': 'location-settings',
  'leave-requests': 'leaveRequests',
  announcements: 'announcements',
  discussions: 'discussions',
  'wa-schedules': 'wa-schedules',
  'wa-blast': 'wa-blast',
  calendar: 'calendar',
  library: 'library',
  reports: 'reports',
  'academic-years': 'academic-years',
  'system-settings': 'system-settings',
  'my-subjects': 'my-subjects',
  'attendance-history': 'attendance-history',
  'qr-attendance': 'qr-attendance',
  'student-attendance': 'student-attendance',
  'face-attendance': 'face-attendance',
  profile: 'profile',
}

// Shared views (available to multiple roles)
const sharedViews: Record<string, React.ReactNode> = {
  announcements: <AnnouncementManagement />,
  discussions: <DiscussionForum />,
  calendar: <CalendarView />,
  library: <DigitalLibrary />,
  attendance: <AttendanceView />,
  reports: <ReportsAnalytics />,
  profile: <ProfileAccount />,
  assignments: <AssignmentManagement />,
  quizzes: <QuizManagement />,
  grades: <GradeManagement />,
  leaveRequests: <LeaveRequestManagement />,
}

// Role-specific view access
const roleViews: Record<string, Record<string, React.ReactNode>> = {
  admin: {
    dashboard: <AdminDashboard />,
    subjects: <SubjectManagement />,
    classes: <ClassManagement />,
    teachers: <TeacherManagement />,
    students: <StudentManagement />,
    schedules: <ScheduleManagement />,
    materials: <MaterialManagement />,
    'academic-years': <AcademicYearManagement />,
    'system-settings': <SystemSettings />,
    'wa-schedules': <WAScheduleManagement />,
    'wa-blast': <WABlastManagement />,
    'face-registration': <FaceRegistration />,
    'location-settings': <LocationSettings />,
    exams: <ExamManagement />,
  },
  teacher: {
    dashboard: <TeacherDashboard />,
    'my-subjects': <MySubjects />,
    materials: <MaterialManagement />,
    exams: <ExamManagement />,
  },
  wali_kelas: {
    dashboard: <WaliKelasDashboard />,
    'my-subjects': <MySubjects />,
    materials: <MaterialManagement />,
    exams: <ExamManagement />,
    'attendance-history': <AttendanceHistory />,
    leaveRequests: <LeaveRequestManagement />,
  },
  guru_bk: {
    dashboard: <GuruBKDashboard />,
    'attendance-history': <AttendanceHistory />,
    leaveRequests: <LeaveRequestManagement />,
  },
  parent: {
    dashboard: <ParentDashboard />,
    'attendance-history': <AttendanceHistory />,
  },
  student: {
    dashboard: <StudentDashboard />,
    'my-subjects': <MySubjects />,
    materials: <MaterialManagement />,
    exams: <ExamManagement />,
    'attendance-history': <AttendanceHistory />,
    'qr-attendance': <QRAttendance />,
    'student-attendance': <StudentAttendance />,
    'face-attendance': <FaceAttendance />,
  },
}

export default function ViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser } = useAppStore()

  // Get view slug from URL params
  const viewSlug = params.view ? (params.view as string[]).join('/') : ''

  // Empty slug means /dashboard
  const effectiveSlug = viewSlug || 'dashboard'

  // Resolve to internal view ID
  const viewId = slugToViewId[effectiveSlug]

  useEffect(() => {
    // If slug is invalid, redirect to dashboard
    if (!viewId) {
      router.replace('/dashboard')
    }
  }, [viewId, router])

  if (!currentUser || !viewId) {
    return null
  }

  const role = currentUser.role

  // Get role-specific view
  const roleSpecificView = roleViews[role]?.[viewId]
  if (roleSpecificView) {
    return roleSpecificView
  }

  // Check shared views
  const sharedView = sharedViews[viewId]
  if (sharedView) {
    return sharedView
  }

  // No matching view - redirect to dashboard
  // Use useEffect to avoid rendering during redirect
  return <RedirectToDashboard />
}

function RedirectToDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return null
}
