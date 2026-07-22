'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Filter,
  X,
  BookOpen,
  GraduationCap,
  PartyPopper,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventItem {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  type: string
  location: string | null
  createdBy: string
  classId: string | null
  isAssignment?: boolean
  creator?: { id: string; name: string }
  class?: { id: string; name: string } | null
}

interface ClassItem {
  id: string
  name: string
}

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  event: { label: 'Acara', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950/50', icon: CalendarIcon },
  holiday: { label: 'Libur', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950/50', icon: PartyPopper },
  exam: { label: 'Ujian', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/50', icon: GraduationCap },
  deadline: { label: 'Deadline', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-950/50', icon: AlertCircle },
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function CalendarView() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [events, setEvents] = useState<CalendarEventItem[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '',
    type: 'event',
    location: '',
    classId: 'all',
  })

  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher'

  const fetchEvents = useCallback(async () => {
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
      const params = new URLSearchParams()
      params.set('start', start.toISOString())
      params.set('end', end.toISOString())
      if (filterType !== 'all') params.set('type', filterType)
      const res = await fetch(`/api/calendar-events?${params}`)
      const data = await res.json()
      if (!data.error) setEvents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentDate, filterType])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (!data.error) setClasses(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchClasses()
  }, [fetchEvents, fetchClasses])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false })
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    // Next month days
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    return days
  }, [currentDate])

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(e => {
      const startStr = new Date(e.startDate).toISOString().split('T')[0]
      if (startStr === dateStr) return true
      if (e.endDate) {
        const endStr = new Date(e.endDate).toISOString().split('T')[0]
        if (dateStr >= startStr && dateStr <= endStr) return true
      }
      return false
    })
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const handleAddEvent = async () => {
    if (!form.title || !form.startDate) {
      toast({ title: 'Error', description: 'Judul dan tanggal mulai wajib diisi', variant: 'destructive' })
      return
    }
    try {
      const startDateTime = form.startTime ? `${form.startDate}T${form.startTime}:00` : form.startDate
      const endDateTime = form.endDate && form.endTime ? `${form.endDate}T${form.endTime}:00` : form.endDate || null

      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          startDate: startDateTime,
          endDate: endDateTime,
          type: form.type,
          location: form.location || null,
          createdBy: currentUser?.id,
          classId: form.classId === 'all' ? null : form.classId,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Event berhasil ditambahkan' })
      setShowAddDialog(false)
      setForm({ title: '', description: '', startDate: '', startTime: '08:00', endDate: '', endTime: '', type: 'event', location: '', classId: 'all' })
      fetchEvents()
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Yakin ingin menghapus event ini?')) return
    try {
      await fetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Event berhasil dihapus' })
      setShowDetailDialog(false)
      setSelectedEvent(null)
      fetchEvents()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const today = () => { setCurrentDate(new Date()); setSelectedDate(new Date()) }

  const isToday = (date: Date) => {
    const now = new Date()
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" /> Kalender Akademik
          </h1>
          <p className="text-sm text-muted-foreground">Jadwal acara, ujian, dan deadline</p>
        </div>
        {isAdminOrTeacher && (
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Event
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="event">Acara</SelectItem>
            <SelectItem value="holiday">Libur</SelectItem>
            <SelectItem value="exam">Ujian</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                  <CardTitle className="text-lg min-w-[180px] text-center">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <Button variant="outline" size="sm" onClick={today}>Hari Ini</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 border-t border-l">
                    {calendarDays.map(({ date, isCurrentMonth }, i) => {
                      const dayEvents = getEventsForDate(date)
                      return (
                        <div
                          key={i}
                          className={cn(
                            "border-r border-b p-1 min-h-[80px] cursor-pointer transition-colors hover:bg-accent/50",
                            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                            isSelected(date) && "bg-primary/10",
                          )}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                            isToday(date) && "bg-primary text-primary-foreground",
                          )}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map(ev => {
                              const tc = typeConfig[ev.type] || typeConfig.event
                              return (
                                <div
                                  key={ev.id}
                                  className={cn("text-xs px-1 py-0.5 rounded truncate cursor-pointer", tc.bgColor, tc.color)}
                                  onClick={e => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailDialog(true) }}
                                  title={ev.title}
                                >
                                  {ev.title}
                                </div>
                              )
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 2} lainnya</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Selected Date Events */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate ? (
                  <>Event pada {selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                ) : (
                  'Pilih tanggal untuk melihat event'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-4">Klik tanggal di kalender</p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada event pada tanggal ini</p>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {selectedDateEvents.map(ev => {
                      const tc = typeConfig[ev.type] || typeConfig.event
                      const TIcon = tc.icon
                      return (
                        <Card
                          key={ev.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => { setSelectedEvent(ev); setShowDetailDialog(true) }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <div className={cn("w-8 h-8 rounded flex items-center justify-center shrink-0", tc.bgColor)}>
                                <TIcon className={cn("w-4 h-4", tc.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-1">{ev.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(ev.startDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                  {ev.location && (
                                    <>
                                      <MapPin className="w-3 h-3" />
                                      <span>{ev.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">LEGENDA</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(typeConfig).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm", config.bgColor)} />
                    <span className="text-xs">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Event Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul event" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Selesai (opsional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Waktu Selesai</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Acara</SelectItem>
                    <SelectItem value="holiday">Libur</SelectItem>
                    <SelectItem value="exam">Ujian</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Lokasi (opsional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddEvent}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (() => {
            const tc = typeConfig[selectedEvent.type] || typeConfig.event
            const TIcon = tc.icon
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded flex items-center justify-center", tc.bgColor)}>
                      <TIcon className={cn("w-4 h-4", tc.color)} />
                    </div>
                    {selectedEvent.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={cn(tc.bgColor, tc.color)}>{tc.label}</Badge>
                    {selectedEvent.class && <Badge variant="outline">{selectedEvent.class.name}</Badge>}
                    {selectedEvent.isAssignment && <Badge variant="outline" className="text-primary"><BookOpen className="w-3 h-3 mr-1" /> Tugas</Badge>}
                  </div>
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(selectedEvent.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {selectedEvent.endDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>s/d {new Date(selectedEvent.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                {isAdminOrTeacher && !selectedEvent.isAssignment && (
                  <DialogFooter>
                    <Button variant="destructive" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                      <X className="w-4 h-4 mr-2" /> Hapus
                    </Button>
                  </DialogFooter>
                )}
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
