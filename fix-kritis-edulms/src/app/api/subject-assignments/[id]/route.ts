import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.subjectAssignment.delete({ where: { id } })
    return NextResponse.json({ message: 'Penugasan berhasil dihapus' })
  } catch (error) {
    console.error('SubjectAssignment DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
