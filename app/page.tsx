'use client'

import { useState } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { ImageProcessor } from '@/components/image-processor'
import { ThemeSwitcher } from "@/components/theme-switcher"

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface ProcessedImage {
  id: string
  originalName: string
  processedName: string
  originalSize: { width: number; height: number }
  finalSize: { width: number; height: number }
  wasResized: boolean
  wasUpscaled: boolean
  scaleFactor?: number
  downloadUrl: string
  preview: string
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([])

  const handleFilesSelected = (files: ImageFile[]) => {
    setSelectedFiles(files)
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <span>Universal Image Upscaler</span>
            </div>
            <ThemeSwitcher />
          </div>
        </nav>
        
        <div className="flex-1 w-full flex flex-col gap-8 max-w-6xl mx-auto px-4">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              🎨 Universal Image Upscaler
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prześlij swoje zdjęcia i ulepsz je dzięki technologii skalowania AI. 
              Konwertuj formaty, zmieniaj rozmiar i powiększaj obrazy do wyższej rozdzielczości.
            </p>
          </div>

          <div className="space-y-8">
            <ImageUploader 
              onFilesSelected={handleFilesSelected}
              maxFiles={100}
            />
            
            {selectedFiles.length > 0 && (
              <ImageProcessor
                files={selectedFiles}
                onProcessingComplete={() => {}}
              />
            )}
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
          <p>Universal Image Upscaler - Free & Open Source</p>
        </footer>
      </div>
    </main>
  )
}