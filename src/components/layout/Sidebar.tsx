'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, FileText,
  ClipboardList, BarChart3, Calendar, MessageSquare, Megaphone,
  Library, Settings, X, PenTool, Brain, TrendingUp,
  School, MessageCircle, Send, QrCode, MapPin, ScanFace, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type MenuItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group?: string
  href: string
}

const adminMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen, group: 'Akademik', href: '/subjects' },
  { id: 'classes', label: 'Manajemen Kelas', icon: GraduationCap, group: 'Akademik', href: '/classes' },
  { id: 'teachers', label: 'Manajemen Guru', icon: Users, group: 'Akademik', href: '/teachers' },
  { id: 'students', label: 'Manajemen Siswa', icon: Users, group: 'Akademik', href: '/students' },
  { id: 'schedules', label: 'Jadwal Pelajaran', icon: Calendar, group: 'Akademik', href: '/schedules' },
  { id: 'materials', label: 'Materi Pelajaran', icon: FileText, group: 'Pembelajaran', href: '/materials' },
  { id: 'assignments', label: 'Tugas', icon: PenTool, group: 'Pembelajaran', href: '/assignments' },
  { id: 'quizzes', label: 'Bank Soal & Quiz', icon: Brain, group: 'Pembelajaran', href: '/quizzes' },
  { id: 'exams', label: 'Ujian Anti Nyontek', icon: ShieldCheck, group: 'Pembelajaran', href: '/exams' },
  { id: 'grades', label: 'Penilaian & Rapor', icon: BarChart3, group: 'Pembelajaran', href: '/grades' },
  { id: 'attendance', label: 'Absensi', icon: ClipboardList, group: 'Kehadiran', href: '/attendance' },
  { id: 'face-registration', label: 'Registrasi Wajah', icon: ScanFace, group: 'Kehadiran', href: '/face-registration' },
  { id: 'location-settings', label: 'Pengaturan Lokasi', icon: MapPin, group: 'Kehadiran', href: '/location-settings' },
  { id: 'leave-requests', label: 'Izin/Sakit', icon: FileText, group: 'Kehadiran', href: '/leave-requests' },
  { id: 'attendance-reports', label: 'Laporan Absensi', icon: TrendingUp, group: 'Kehadiran', href: '/attendance-reports' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'discussions', label: 'Forum Diskusi', icon: MessageSquare, group: 'Komunikasi', href: '/discussions' },
  { id: 'wa-schedules', label: 'Jadwal Laporan WA', icon: MessageCircle, group: 'WhatsApp', href: '/wa-schedules' },
  { id: 'wa-blast', label: 'WA Blast', icon: Send, group: 'WhatsApp', href: '/wa-blast' },
  { id: 'calendar', label: 'Kalender Akademik', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'library', label: 'Perpustakaan Digital', icon: Library, group: 'Lainnya', href: '/library' },
  { id: 'reports', label: 'Laporan & Analitik', icon: BarChart3, group: 'Lainnya', href: '/reports' },
  { id: 'academic-years', label: 'Tahun Ajaran', icon: School, group: 'Sistem', href: '/academic-years' },
  { id: 'system-settings', label: 'Pengaturan Sistem', icon: Settings, group: 'Sistem', href: '/system-settings' },
]

const teacherMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'my-subjects', label: 'Mata Pelajaran Saya', icon: BookOpen, group: 'Pembelajaran', href: '/my-subjects' },
  { id: 'materials', label: 'Materi Pelajaran', icon: FileText, group: 'Pembelajaran', href: '/materials' },
  { id: 'assignments', label: 'Tugas', icon: PenTool, group: 'Pembelajaran', href: '/assignments' },
  { id: 'quizzes', label: 'Bank Soal & Quiz', icon: Brain, group: 'Pembelajaran', href: '/quizzes' },
  { id: 'exams', label: 'Ujian Anti Nyontek', icon: ShieldCheck, group: 'Pembelajaran', href: '/exams' },
  { id: 'grades', label: 'Penilaian', icon: BarChart3, group: 'Pembelajaran', href: '/grades' },
  { id: 'attendance', label: 'Absensi Kelas', icon: ClipboardList, group: 'Kehadiran', href: '/attendance' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'discussions', label: 'Forum Diskusi', icon: MessageSquare, group: 'Komunikasi', href: '/discussions' },
  { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'profile', label: 'Profil Akun', icon: Settings, group: 'Lainnya', href: '/profile' },
]

const studentMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'my-subjects', label: 'Mata Pelajaran', icon: BookOpen, group: 'Pembelajaran', href: '/my-subjects' },
  { id: 'materials', label: 'Materi Pelajaran', icon: FileText, group: 'Pembelajaran', href: '/materials' },
  { id: 'assignments', label: 'Tugas Saya', icon: PenTool, group: 'Pembelajaran', href: '/assignments' },
  { id: 'quizzes', label: 'Quiz & Ujian', icon: Brain, group: 'Pembelajaran', href: '/quizzes' },
  { id: 'exams', label: 'Ujian Anti Nyontek', icon: ShieldCheck, group: 'Pembelajaran', href: '/exams' },
  { id: 'grades', label: 'Nilai Saya', icon: BarChart3, group: 'Pembelajaran', href: '/grades' },
  { id: 'student-attendance', label: 'Absen GPS', icon: MapPin, group: 'Kehadiran', href: '/student-attendance' },
  { id: 'qr-attendance', label: 'Absensi QR', icon: QrCode, group: 'Kehadiran', href: '/qr-attendance' },
  { id: 'face-attendance', label: 'Absen Wajah', icon: ScanFace, group: 'Kehadiran', href: '/face-attendance' },
  { id: 'attendance-history', label: 'Riwayat Absensi', icon: ClipboardList, group: 'Kehadiran', href: '/attendance-history' },
  { id: 'leave-requests', label: 'Pengajuan Izin/Sakit', icon: FileText, group: 'Kehadiran', href: '/leave-requests' },
  { id: 'discussions', label: 'Forum Diskusi', icon: MessageSquare, group: 'Komunikasi', href: '/discussions' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'library', label: 'Perpustakaan Digital', icon: Library, group: 'Lainnya', href: '/library' },
  { id: 'profile', label: 'Profil Akun', icon: Settings, group: 'Lainnya', href: '/profile' },
]

const waliKelasMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'my-subjects', label: 'Mata Pelajaran Saya', icon: BookOpen, group: 'Pembelajaran', href: '/my-subjects' },
  { id: 'materials', label: 'Materi Pelajaran', icon: FileText, group: 'Pembelajaran', href: '/materials' },
  { id: 'assignments', label: 'Tugas', icon: PenTool, group: 'Pembelajaran', href: '/assignments' },
  { id: 'quizzes', label: 'Bank Soal & Quiz', icon: Brain, group: 'Pembelajaran', href: '/quizzes' },
  { id: 'exams', label: 'Ujian Anti Nyontek', icon: ShieldCheck, group: 'Pembelajaran', href: '/exams' },
  { id: 'grades', label: 'Penilaian', icon: BarChart3, group: 'Pembelajaran', href: '/grades' },
  { id: 'attendance', label: 'Absensi Kelas', icon: ClipboardList, group: 'Kehadiran', href: '/attendance' },
  { id: 'leaveRequests', label: 'Izin/Sakit', icon: FileText, group: 'Kehadiran', href: '/leave-requests' },
  { id: 'attendance-reports', label: 'Laporan Absensi', icon: TrendingUp, group: 'Kehadiran', href: '/attendance-reports' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'discussions', label: 'Forum Diskusi', icon: MessageSquare, group: 'Komunikasi', href: '/discussions' },
  { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'profile', label: 'Profil Akun', icon: Settings, group: 'Lainnya', href: '/profile' },
]

const guruBKMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'attendance', label: 'Absensi', icon: ClipboardList, group: 'Kehadiran', href: '/attendance' },
  { id: 'leaveRequests', label: 'Izin/Sakit', icon: FileText, group: 'Kehadiran', href: '/leave-requests' },
  { id: 'grades', label: 'Penilaian', icon: BarChart3, group: 'Akademik', href: '/grades' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'discussions', label: 'Forum Diskusi', icon: MessageSquare, group: 'Komunikasi', href: '/discussions' },
  { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'profile', label: 'Profil Akun', icon: Settings, group: 'Lainnya', href: '/profile' },
]

const parentMenu: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', href: '/dashboard' },
  { id: 'grades', label: 'Nilai Anak', icon: BarChart3, group: 'Monitoring', href: '/grades' },
  { id: 'attendance-history', label: 'Kehadiran Anak', icon: ClipboardList, group: 'Monitoring', href: '/attendance-history' },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, group: 'Komunikasi', href: '/announcements' },
  { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'Lainnya', href: '/calendar' },
  { id: 'profile', label: 'Profil Akun', icon: Settings, group: 'Lainnya', href: '/profile' },
]

export function Sidebar() {
  const { currentUser, sidebarOpen, setSidebarOpen } = useAppStore()
  const pathname = usePathname()

  const menuItems = currentUser?.role === 'admin' ? adminMenu
    : currentUser?.role === 'teacher' ? teacherMenu
    : currentUser?.role === 'wali_kelas' ? waliKelasMenu
    : currentUser?.role === 'guru_bk' ? guruBKMenu
    : currentUser?.role === 'parent' ? parentMenu
    : studentMenu

  // Group menu items
  const groups = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const group = item.group || 'Lainnya'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Guru',
    wali_kelas: 'Wali Kelas',
    guru_bk: 'Guru BK',
    student: 'Siswa',
    parent: 'Orang Tua',
  }

  // Determine if a menu item is active based on the current pathname
  const isActive = (item: MenuItem) => {
    // Exact match for the href path
    const itemPath = item.href
    return pathname === itemPath || pathname === itemPath + '/'
  }

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto lg:h-screen",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <School className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">EduLMS</h2>
            <p className="text-xs text-muted-foreground truncate">Learning Management System</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 py-2">
          <div className="rounded-lg bg-primary/10 px-3 py-2 mb-2">
            <p className="text-xs font-medium text-primary truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[currentUser?.role || ''] || currentUser?.role}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-3 custom-scrollbar">
          <nav className="space-y-1 pb-4">
            {Object.entries(groups).map(([groupName, items], groupIndex) => (
              <div key={groupName}>
                {groupIndex > 0 && <Separator className="my-2" />}
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupName}</p>
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive(item)
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">v2.0.0 &copy; 2026 EduLMS</p>
        </div>
      </aside>
    </>
  )
}