'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface ImageUploaderProps {
  onFilesSelected: (files: ImageFile[]) => void
  maxFiles?: number
  acceptedFormats?: string[]
}

export function ImageUploader({ 
  onFilesSelected, 
  maxFiles = 100,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/gif']
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([])
  const [urlsText, setUrlsText] = useState('')
  const [isLoadingUrls, setIsLoadingUrls] = useState(false)

  const handleFiles = useCallback((files: FileList) => {
    const validFiles: ImageFile[] = []
    
    Array.from(files).forEach((file) => {
      if (acceptedFormats.includes(file.type) && validFiles.length + selectedFiles.length < maxFiles) {
        const id = Math.random().toString(36).substring(7)
        const preview = URL.createObjectURL(file)
        validFiles.push({ file, preview, id })
      }
    })

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles]
      setSelectedFiles(newFiles)
      onFilesSelected(newFiles)
    }
  }, [acceptedFormats, maxFiles, selectedFiles, onFilesSelected])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((id: string) => {
    const newFiles = selectedFiles.filter((file) => {
      if (file.id === id) {
        URL.revokeObjectURL(file.preview)
        return false
      }
      return true
    })
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
  }, [selectedFiles, onFilesSelected])

  const clearAll = useCallback(() => {
    selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    setSelectedFiles([])
    setUrlsText('')
    onFilesSelected([])
  }, [selectedFiles, onFilesSelected])

  const handleUrlsLoad = useCallback(async () => {
    if (!urlsText.trim()) return

    setIsLoadingUrls(true)
    const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url)
    const loadedFiles: ImageFile[] = []

    for (const url of urls) {
      if (selectedFiles.length + loadedFiles.length >= maxFiles) break

      try {
        const response = await fetch(url)
        if (!response.ok) continue

        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) continue

        // Extract filename from URL or generate one
        const urlObj = new URL(url)
        const pathName = urlObj.pathname
        const fileName = pathName.split('/').pop() || `image_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const baseName = fileName.split('.')[0] || `image_${Date.now()}`

        const file = new File([blob], `${baseName}.${blob.type.split('/')[1]}`, { type: blob.type })
        const id = Math.random().toString(36).substring(7)
        const preview = URL.createObjectURL(blob)

        loadedFiles.push({ file, preview, id })
      } catch (error) {
        console.error(`Failed to load image from ${url}:`, error)
      }
    }

    if (loadedFiles.length > 0) {
      const newFiles = [...selectedFiles, ...loadedFiles]
      setSelectedFiles(newFiles)
      onFilesSelected(newFiles)
    }

    setIsLoadingUrls(false)
  }, [urlsText, selectedFiles, maxFiles, onFilesSelected])

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept={acceptedFormats.join(',')}
              onChange={handleInputChange}
              className="sr-only"
              id="file-upload"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Prześlij zdjęcia</h3>
                <p className="text-muted-foreground mt-1">
                  Przeciągnij pliki tutaj lub kliknij, aby wybrać
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Obsługiwane formaty: JPEG, PNG, WebP, AVIF, BMP, TIFF, GIF
                </p>
                <p className="text-sm text-muted-foreground">
                  Maksymalnie {maxFiles} plików
                </p>
              </div>
              
              <Button asChild className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Wybierz pliki
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* URL Input Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Lub wklej linki do zdjęć</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Jeden link w każdej linii
              </p>
              <textarea
                className="w-full h-32 p-3 border border-muted-foreground/25 rounded-md resize-none"
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png&#10;https://example.com/image3.webp"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUrlsLoad}
              disabled={isLoadingUrls || !urlsText.trim()}
              className="w-full"
            >
              {isLoadingUrls ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Pobieranie obrazów...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Pobierz obrazy z linków
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Wybrane pliki ({selectedFiles.length})
              </h3>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Wyczyść wszystkie
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedFiles.map((imageFile) => (
                <div key={imageFile.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageFile.preview}
                      alt={imageFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(imageFile.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    {imageFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(imageFile.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}