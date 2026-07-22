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
  Library,
  Plus,
  Search,
  Star,
  BookOpen,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Filter,
  FileText,
  User,
  Calendar,
  Hash,
  Building,
  Upload,
} from 'lucide-react'
import FileUpload from '@/components/ui/file-upload'

interface Book {
  id: string
  title: string
  author: string | null
  category: string | null
  description: string | null
  fileUrl: string | null
  coverUrl: string | null
  isbn: string | null
  publisher: string | null
  year: number | null
  pages: number | null
  isAvailable: boolean
  createdAt: string
  avgRating: number
  _count: { reviews: number }
  reviews?: Review[]
}

interface Review {
  id: string
  bookId: string
  userId: string
  rating: number
  review: string | null
  createdAt: string
  user: { id: string; name: string; photoUrl: string | null }
}

export default function DigitalLibrary() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [bookDetail, setBookDetail] = useState<Book | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showBookDialog, setShowBookDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' })
  const [bookForm, setBookForm] = useState({
    title: '', author: '', category: '', description: '',
    fileUrl: '', coverUrl: '', isbn: '', publisher: '',
    year: '', pages: '', isAvailable: true,
  })

  const isAdmin = currentUser?.role === 'admin'

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory !== 'all') params.set('category', filterCategory)
      const res = await fetch(`/api/library?${params}`)
      const data = await res.json()
      if (!data.error) setBooks(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory])

  const fetchBookDetail = useCallback(async (bookId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/library/${bookId}`)
      const data = await res.json()
      if (!data.error) setBookDetail(data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    if (selectedBook) fetchBookDetail(selectedBook)
  }, [selectedBook, fetchBookDetail])

  const categories = [...new Set(books.map(b => b.category).filter(Boolean))] as string[]

  const handleSaveBook = async () => {
    if (!bookForm.title) {
      toast({ title: 'Error', description: 'Judul buku wajib diisi', variant: 'destructive' })
      return
    }
    try {
      const payload = {
        ...bookForm,
        year: bookForm.year ? parseInt(bookForm.year) : null,
        pages: bookForm.pages ? parseInt(bookForm.pages) : null,
      }
      if (editId) {
        const res = await fetch(`/api/library/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return }
        toast({ title: 'Berhasil', description: 'Buku berhasil diperbarui' })
      } else {
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return }
        toast({ title: 'Berhasil', description: 'Buku berhasil ditambahkan' })
      }
      setShowBookDialog(false)
      setEditId(null)
      setBookForm({ title: '', author: '', category: '', description: '', fileUrl: '', coverUrl: '', isbn: '', publisher: '', year: '', pages: '', isAvailable: true })
      fetchBooks()
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Yakin ingin menghapus buku ini?')) return
    try {
      await fetch(`/api/library/${id}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Buku berhasil dihapus' })
      setSelectedBook(null)
      setBookDetail(null)
      fetchBooks()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const handleAddReview = async () => {
    if (!selectedBook) return
    try {
      const res = await fetch(`/api/library/${selectedBook}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          rating: reviewForm.rating,
          review: reviewForm.review || null,
        }),
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return }
      toast({ title: 'Berhasil', description: 'Review berhasil ditambahkan' })
      setShowReviewDialog(false)
      setReviewForm({ rating: 5, review: '' })
      fetchBookDetail(selectedBook)
      fetchBooks()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan review', variant: 'destructive' })
    }
  }

  const openEditBook = (book: Book) => {
    setBookForm({
      title: book.title,
      author: book.author || '',
      category: book.category || '',
      description: book.description || '',
      fileUrl: book.fileUrl || '',
      coverUrl: book.coverUrl || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      year: book.year?.toString() || '',
      pages: book.pages?.toString() || '',
      isAvailable: book.isAvailable,
    })
    setEditId(book.id)
    setShowBookDialog(true)
  }

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
            onClick={interactive ? () => setReviewForm(f => ({ ...f, rating: star })) : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
          />
        ))}
      </div>
    )
  }

  // Book detail view
  if (selectedBook && bookDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => { setSelectedBook(null); setBookDetail(null) }} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Perpustakaan
        </Button>

        {detailLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Book cover */}
                  <div className="w-40 h-56 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                    {bookDetail.coverUrl ? (
                      <img src={bookDetail.coverUrl} alt={bookDetail.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-xl font-bold">{bookDetail.title}</h2>
                      {isAdmin && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openEditBook(bookDetail)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteBook(bookDetail.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                    {bookDetail.author && <p className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> {bookDetail.author}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      {bookDetail.category && <Badge variant="outline">{bookDetail.category}</Badge>}
                      {bookDetail.isAvailable ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50">Tersedia</Badge>
                      ) : (
                        <Badge variant="secondary">Tidak Tersedia</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(bookDetail.avgRating)}
                      <span className="text-sm text-muted-foreground">
                        {bookDetail.avgRating}/5 ({bookDetail._count?.reviews || 0} review)
                      </span>
                    </div>
                    {bookDetail.description && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-1">Deskripsi</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bookDetail.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                      {bookDetail.isbn && <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-muted-foreground" /> ISBN: {bookDetail.isbn}</div>}
                      {bookDetail.publisher && <div className="flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground" /> {bookDetail.publisher}</div>}
                      {bookDetail.year && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> {bookDetail.year}</div>}
                      {bookDetail.pages && <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> {bookDetail.pages} halaman</div>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {bookDetail.fileUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={bookDetail.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" /> Baca Buku</a>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setShowReviewDialog(true)} className="gap-1">
                        <Star className="w-4 h-4" /> Tulis Review
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Review</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  {!bookDetail.reviews || bookDetail.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada review</p>
                  ) : (
                    <div className="space-y-3">
                      {bookDetail.reviews.map(r => (
                        <div key={r.id} className="border-b pb-3 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{r.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{r.user.name}</span>
                          </div>
                          <div className="mb-1">{renderStars(r.rating)}</div>
                          {r.review && <p className="text-xs text-muted-foreground">{r.review}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString('id-ID')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tulis Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-6 h-6 cursor-pointer ${star <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                      onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                    />
                  ))}
                  <span className="text-sm ml-2">{reviewForm.rating}/5</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Review (opsional)</Label>
                <Textarea
                  value={reviewForm.review}
                  onChange={e => setReviewForm(f => ({ ...f, review: e.target.value }))}
                  placeholder="Tulis review Anda..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Batal</Button>
              <Button onClick={handleAddReview}>Kirim Review</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="w-6 h-6 text-primary" /> Perpustakaan Digital
          </h1>
          <p className="text-sm text-muted-foreground">Koleksi buku digital sekolah</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setBookForm({ title: '', author: '', category: '', description: '', fileUrl: '', coverUrl: '', isbn: '', publisher: '', year: '', pages: '', isAvailable: true }); setEditId(null); setShowBookDialog(true) }} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Buku
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari judul atau penulis..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full mb-3" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Library className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Belum ada buku</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map(book => (
            <Card
              key={book.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedBook(book.id)}
            >
              <CardContent className="p-4">
                <div className="w-full h-40 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 overflow-hidden">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-white/80" />
                  )}
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
                {book.author && <p className="text-xs text-muted-foreground mt-1">{book.author}</p>}
                <div className="flex items-center justify-between mt-2">
                  {book.category && <Badge variant="outline" className="text-xs">{book.category}</Badge>}
                  <div className="flex items-center gap-1">
                    <Star className={`w-3 h-3 ${book.avgRating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    <span className="text-xs text-muted-foreground">{book.avgRating > 0 ? book.avgRating : '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Book Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Buku' : 'Tambah Buku Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul buku" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Penulis</Label>
                <Input value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} placeholder="Nama penulis" />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} placeholder="Kategori" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={bookForm.description} onChange={e => setBookForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi buku..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ISBN</Label>
                <Input value={bookForm.isbn} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} placeholder="ISBN" />
              </div>
              <div className="space-y-2">
                <Label>Penerbit</Label>
                <Input value={bookForm.publisher} onChange={e => setBookForm(f => ({ ...f, publisher: e.target.value }))} placeholder="Penerbit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input type="number" value={bookForm.year} onChange={e => setBookForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" />
              </div>
              <div className="space-y-2">
                <Label>Jumlah Halaman</Label>
                <Input type="number" value={bookForm.pages} onChange={e => setBookForm(f => ({ ...f, pages: e.target.value }))} placeholder="200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>File Buku</Label>
              <FileUpload
                onUpload={(url, name) => setBookForm(f => ({ ...f, fileUrl: url }))}
                currentUrl={bookForm.fileUrl}
                currentName={bookForm.fileUrl ? bookForm.fileUrl.split('/').pop() : null}
                accept=".pdf,.epub"
                label="Upload File Buku"
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Buku</Label>
              <FileUpload
                onUpload={(url, name) => setBookForm(f => ({ ...f, coverUrl: url }))}
                currentUrl={bookForm.coverUrl}
                currentName={bookForm.coverUrl ? bookForm.coverUrl.split('/').pop() : null}
                accept="image/*"
                label="Upload Cover"
                preview
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>Batal</Button>
            <Button onClick={handleSaveBook}>{editId ? 'Simpan' : 'Tambah'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
