'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Download, Settings, Zap, Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface ProcessingSettings {
  enableUpscaling: boolean
  targetSize: number
  maxDimension: number
  namePrefix: string
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

interface ImageProcessorProps {
  files: Array<{ file: File; preview: string; id: string }>
  onProcessingComplete: (results: ProcessedImage[]) => void
}

export function ImageProcessor({ files, onProcessingComplete }: ImageProcessorProps) {
  const [settings, setSettings] = useState<ProcessingSettings>({
    enableUpscaling: true,
    targetSize: 2560,
    maxDimension: 1300,
    namePrefix: ''
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [processingLogs, setProcessingLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const processImages = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setProcessedImages([])
    setProcessingLogs([])
    addLog('Rozpoczęcie przetwarzania obrazów...')

    const results: ProcessedImage[] = []

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i]
      const fileName = settings.namePrefix 
        ? `${settings.namePrefix}_${i + 1}` 
        : `image_${i + 1}`
      
      setCurrentFile(fileData.file.name)
      addLog(`Przetwarzanie ${i + 1}/${files.length}: ${fileData.file.name}`)

      try {
        // Process basic image first
        const formData = new FormData()
        formData.append('file', fileData.file)
        formData.append('settings', JSON.stringify({
          ...settings,
          fileName,
          enableUpscaling: false // Disable API upscaling, we'll do it here
        }))

        const response = await fetch('/api/process-image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        addLog(`✅ Basic processing: ${fileName}.png`)

        // Now do upscaling directly if enabled
        let finalResult = result
        if (settings.enableUpscaling && Math.max(result.finalSize.width, result.finalSize.height) < settings.targetSize) {
          addLog(`🔬 Starting Replicate upscaling for ${fileName}...`)
          
          try {
            addLog(`📤 Sending to Replicate API...`)
            
            // Convert relative URL to absolute URL
            const absoluteImageUrl = result.downloadUrl.startsWith('http') 
              ? result.downloadUrl 
              : `${window.location.origin}${result.downloadUrl}`
            
            addLog(`🌐 Absolute URL: ${absoluteImageUrl}`)
            addLog(`📋 Payload: ${JSON.stringify({
              imageUrl: absoluteImageUrl,
              fileName: fileName,
              currentSize: result.finalSize,
              targetSize: settings.targetSize
            })}`)
            
            const replicateResponse = await fetch('/api/upscale-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: absoluteImageUrl,
                fileName: fileName,
                currentSize: result.finalSize,
                targetSize: settings.targetSize
              })
            })
            
            const upscaleResult = await replicateResponse.json()
            addLog(`🔍 REPLICATE RESPONSE: ${JSON.stringify(upscaleResult)}`)
            
            if (upscaleResult.replicateRawOutput) {
              addLog(`🔥 DIRECT REPLICATE OUTPUT: ${JSON.stringify(upscaleResult.replicateRawOutput)}`)
            }
            
            if (upscaleResult.success) {
              finalResult = {
                ...result,
                wasUpscaled: true,
                scaleFactor: upscaleResult.scaleFactor,
                finalSize: upscaleResult.finalSize,
                downloadUrl: upscaleResult.downloadUrl,
                preview: upscaleResult.downloadUrl
              }
              addLog(`✅ ${fileName}.png - powiększony pomyślnie`)
            } else {
              addLog(`❌ Replicate error: ${upscaleResult.error}`)
            }
          } catch (upscaleError) {
            addLog(`❌ Upscaling failed: ${upscaleError}`)
          }
        }
        
        const processedImage: ProcessedImage = {
          id: fileData.id,
          originalName: fileData.file.name,
          processedName: finalResult.processedName,
          originalSize: finalResult.originalSize,
          finalSize: finalResult.finalSize,
          wasResized: finalResult.wasResized,
          wasUpscaled: finalResult.wasUpscaled,
          scaleFactor: finalResult.scaleFactor,
          downloadUrl: finalResult.downloadUrl,
          preview: finalResult.preview
        }
        
        results.push(processedImage)
        
      } catch (error) {
        addLog(`❌ Błąd przetwarzania ${fileData.file.name}: ${error}`)
      }

      setProgress(((i + 1) / files.length) * 100)
    }

    setProcessedImages(results)
    setIsProcessing(false)
    setCurrentFile('')
    addLog(`Zakończono! Pomyślnie przetworzono ${results.length}/${files.length} obrazów`)
    
    onProcessingComplete(results)
  }

  const downloadAll = async () => {
    if (processedImages.length === 0) return

    try {
      const response = await fetch('/api/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: processedImages.map(img => ({
            id: img.id,
            name: img.processedName,
            downloadUrl: img.downloadUrl
          }))
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `processed_images_${Date.now()}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      addLog(`❌ Błąd pobierania archiwum: ${error}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ustawienia przetwarzania
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="namePrefix">Prefiks nazwy plików</Label>
              <Input
                id="namePrefix"
                placeholder="np. produkt, logo"
                value={settings.namePrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, namePrefix: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {settings.namePrefix ? 
                  `Pliki będą nazwane: ${settings.namePrefix}_1.png, ${settings.namePrefix}_2.png...` :
                  'Pliki będą nazwane: image_1.png, image_2.png...'
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxDimension">Maksymalny wymiar (px)</Label>
              <Input
                id="maxDimension"
                type="number"
                min="100"
                max="4000"
                step="100"
                value={settings.maxDimension}
                onChange={(e) => setSettings(prev => ({ ...prev, maxDimension: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Skalowanie AI</Label>
                <p className="text-sm text-muted-foreground">
                  Powiększ obrazy używając Real-ESRGAN
                </p>
              </div>
              <Switch
                checked={settings.enableUpscaling}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableUpscaling: checked }))}
              />
            </div>

            {settings.enableUpscaling && (
              <div className="space-y-2">
                <Label htmlFor="targetSize">Docelowy maksymalny wymiar (px)</Label>
                <Input
                  id="targetSize"
                  type="number"
                  min="1300"
                  max="4096"
                  step="64"
                  value={settings.targetSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, targetSize: parseInt(e.target.value) }))}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={processImages}
          disabled={isProcessing || files.length === 0}
          size="lg"
          className="min-w-48"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Przetwarzanie...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Przetwórz obrazy ({files.length})
            </>
          )}
        </Button>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Postęp</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              {currentFile && (
                <p className="text-sm text-muted-foreground">
                  Przetwarzanie: {currentFile}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processedImages.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Przetworzone obrazy ({processedImages.length})
            </CardTitle>
            <Button onClick={downloadAll} className="ml-auto">
              <Download className="mr-2 h-4 w-4" />
              Pobierz wszystkie (ZIP)
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedImages.map((image) => (
                <div key={image.id} className="space-y-2">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.preview}
                      alt={image.processedName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{image.processedName}.png</p>
                    <p className="text-xs text-muted-foreground">
                      {image.finalSize.width} × {image.finalSize.height}
                    </p>
                    
                    <div className="flex gap-1 flex-wrap">
                      {image.wasUpscaled && (
                        <Badge variant="secondary" className="text-xs">
                          Powiększony {image.scaleFactor?.toFixed(1)}x
                        </Badge>
                      )}
                      {image.wasResized && (
                        <Badge variant="outline" className="text-xs">
                          Przeskalowany
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = image.downloadUrl
                        a.download = `${image.processedName}.png`
                        a.click()
                      }}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Pobierz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Logs */}
      {processingLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logi przetwarzania</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
              {processingLogs.map((log, index) => (
                <div key={index} className="text-muted-foreground">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}