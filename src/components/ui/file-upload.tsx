'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, FileIcon, Loader2, Image as ImageIcon } from 'lucide-react'

interface FileUploadProps {
  onUpload: (url: string, fileName: string) => void
  onRemove?: () => void
  currentUrl?: string | null
  currentName?: string | null
  accept?: string
  label?: string
  preview?: boolean
}

export default function FileUpload({
  onUpload,
  onRemove,
  currentUrl,
  currentName,
  accept,
  label = 'Upload File',
  preview = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        onUpload(data.fileUrl, data.fileName || file.name)
      } else {
        setError(data.error || 'Gagal mengupload file')
      }
    } catch {
      setError('Gagal mengupload file')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    onUpload('', '')
    onRemove?.()
  }

  const isImage = currentUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentUrl)

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="space-y-2">
          {preview && isImage ? (
            <div className="relative group">
              <img
                src={currentUrl}
                alt={currentName || 'Preview'}
                className="w-full h-32 object-cover rounded-md border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
              {isImage ? (
                <ImageIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm truncate flex-1">{currentName || currentUrl}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleRemove}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengupload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> {label}
              </>
            )}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
