'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  MessageSquare,
  Plus,
  Search,
  Pin,
  Lock,
  Unlock,
  ArrowLeft,
  Send,
  MessageCircle,
  Users,
  Filter,
} from 'lucide-react'

interface Forum {
  id: string
  title: string
  description: string | null
  classId: string
  subjectAssignmentId: string | null
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  class: { id: string; name: string }
  subjectAssignment: { id: string; subject: { id: string; name: string } } | null
  _count: { posts: number }
}

interface Post {
  id: string
  forumId: string
  authorId: string
  content: string
  parentPostId: string | null
  createdAt: string
  author: { id: string; name: string; role: string; photoUrl: string | null }
}

interface ClassItem {
  id: string
  name: string
  subjectAssignments: { id: string; subject: { id: string; name: string } }[]
}

export default function DiscussionForum() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [forums, setForums] = useState<Forum[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedForum, setSelectedForum] = useState<string | null>(null)
  const [forumPosts, setForumPosts] = useState<Post[]>([])
  const [forumDetail, setForumDetail] = useState<Forum | null>(null)
  const [postsLoading, setPostsLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    classId: '',
    subjectAssignmentId: '',
  })

  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher'

  const fetchForums = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterClass !== 'all') params.set('classId', filterClass)
      const res = await fetch(`/api/discussions?${params}`)
      const data = await res.json()
      if (!data.error) setForums(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterClass])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (!data.error) setClasses(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchForumDetail = useCallback(async (forumId: string) => {
    setPostsLoading(true)
    try {
      const res = await fetch(`/api/discussions/${forumId}`)
      const data = await res.json()
      if (!data.error) {
        setForumDetail(data)
        setForumPosts(data.posts || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setPostsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForums()
    fetchClasses()
  }, [fetchForums, fetchClasses])

  useEffect(() => {
    if (selectedForum) fetchForumDetail(selectedForum)
  }, [selectedForum, fetchForumDetail])

  const handleCreateForum = async () => {
    if (!createForm.title || !createForm.classId) {
      toast({ title: 'Error', description: 'Judul dan kelas wajib diisi', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Forum diskusi berhasil dibuat' })
      setShowCreateDialog(false)
      setCreateForm({ title: '', description: '', classId: '', subjectAssignmentId: '' })
      fetchForums()
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return
    try {
      const res = await fetch(`/api/discussions/${selectedForum}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser?.id,
          content: newPostContent,
          parentPostId: replyTo,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      setNewPostContent('')
      setReplyTo(null)
      fetchForumDetail(selectedForum!)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengirim post', variant: 'destructive' })
    }
  }

  const handleTogglePin = async (forumId: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/discussions/${forumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !isPinned }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: isPinned ? 'Forum unpin berhasil' : 'Forum pin berhasil' })
      fetchForums()
      if (selectedForum === forumId) fetchForumDetail(forumId)
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleToggleLock = async (forumId: string, isLocked: boolean) => {
    try {
      const res = await fetch(`/api/discussions/${forumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !isLocked }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: isLocked ? 'Forum berhasil dibuka' : 'Forum berhasil dikunci' })
      fetchForums()
      if (selectedForum === forumId) fetchForumDetail(forumId)
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('Yakin ingin menghapus forum ini beserta semua post?')) return
    try {
      const res = await fetch(`/api/discussions/${forumId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Forum berhasil dihapus' })
      setSelectedForum(null)
      fetchForums()
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  // Build threaded posts
  const buildThreaded = (posts: Post[]): (Post & { replies: Post[] })[] => {
    const map = new Map<string, Post & { replies: Post[] }>()
    const roots: (Post & { replies: Post[] })[] = []
    posts.forEach(p => map.set(p.id, { ...p, replies: [] }))
    posts.forEach(p => {
      const node = map.get(p.id)!
      if (p.parentPostId && map.has(p.parentPostId)) {
        map.get(p.parentPostId)!.replies.push(node)
      } else {
        roots.push(node)
      }
    })
    return roots
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Forum detail view
  if (selectedForum && forumDetail) {
    const threaded = buildThreaded(forumPosts)

    const renderPost = (post: Post & { replies: Post[] }, depth = 0) => (
      <div key={post.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''} mb-4`}>
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{post.author.name}</span>
              <Badge variant="outline" className="text-xs">{post.author.role}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-7 text-xs gap-1"
              onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
            >
              <MessageCircle className="w-3 h-3" /> Balas
            </Button>
            {replyTo === post.id && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="Tulis balasan..."
                  className="text-sm"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreatePost() } }}
                />
                <Button size="sm" onClick={handleCreatePost}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {post.replies.map(r => renderPost(r as Post & { replies: Post[] }, depth + 1))}
      </div>
    )

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => { setSelectedForum(null); setForumDetail(null) }} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Forum
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {forumDetail.isPinned && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50"><Pin className="w-3 h-3 mr-1" /> Pinned</Badge>}
                  {forumDetail.isLocked && <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>}
                  <Badge variant="outline">{forumDetail.class.name}</Badge>
                  {forumDetail.subjectAssignment && (
                    <Badge variant="outline" className="text-primary">{forumDetail.subjectAssignment.subject.name}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{forumDetail.title}</CardTitle>
                {forumDetail.description && (
                  <p className="text-sm text-muted-foreground mt-1">{forumDetail.description}</p>
                )}
              </div>
              {isAdminOrTeacher && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleTogglePin(forumDetail.id, forumDetail.isPinned)}>
                    <Pin className={`w-4 h-4 ${forumDetail.isPinned ? 'text-amber-500' : ''}`} />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleToggleLock(forumDetail.id, forumDetail.isLocked)}>
                    {forumDetail.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteForum(forumDetail.id)}>
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {forumPosts.length} posts</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {new Set(forumPosts.map(p => p.authorId)).size} partisipan</span>
            </div>

            <ScrollArea className="max-h-96 mb-4">
              {postsLoading ? (
                <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : forumPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Belum ada diskusi. Mulai diskusi pertama!</p>
                </div>
              ) : (
                threaded.map(p => renderPost(p))
              )}
            </ScrollArea>

            {!forumDetail.isLocked && (
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={replyTo ? '' : newPostContent}
                    onChange={e => { if (!replyTo) setNewPostContent(e.target.value) }}
                    placeholder={replyTo ? 'Klik Balas pada post di atas...' : 'Tulis pesan baru...'}
                    rows={3}
                    className="flex-1"
                    disabled={!!replyTo}
                  />
                  <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || !!replyTo} className="self-end">
                    <Send className="w-4 h-4 mr-2" /> Kirim
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Forum Diskusi
          </h1>
          <p className="text-sm text-muted-foreground">Diskusi dan tanya jawab antar siswa dan guru</p>
        </div>
        {isAdminOrTeacher && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Buat Forum
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari forum..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Forums List */}
      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}</div>
      ) : forums.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Belum ada forum diskusi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forums.map(forum => (
            <Card
              key={forum.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedForum(forum.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {forum.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
                      {forum.isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                      <Badge variant="outline" className="text-xs">{forum.class.name}</Badge>
                      {forum.subjectAssignment && (
                        <Badge variant="outline" className="text-xs text-primary">{forum.subjectAssignment.subject.name}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm">{forum.title}</h3>
                    {forum.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{forum.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {forum._count.posts} posts</span>
                      <span>{new Date(forum.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Forum Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Forum Diskusi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Forum</Label>
              <Input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul forum" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi forum..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={createForm.classId} onValueChange={v => setCreateForm(f => ({ ...f, classId: v, subjectAssignmentId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <Select value={createForm.subjectAssignmentId} onValueChange={v => setCreateForm(f => ({ ...f, subjectAssignmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opsional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Mapel</SelectItem>
                    {classes.find(c => c.id === createForm.classId)?.subjectAssignments.map(sa => (
                      <SelectItem key={sa.id} value={sa.id}>{sa.subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Batal</Button>
            <Button onClick={handleCreateForum}>Buat Forum</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
