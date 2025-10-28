export interface ImageDimensions {
  width: number
  height: number
}

export interface ProcessingSettings {
  maxDimension: number
  enableUpscaling: boolean
  targetSize: number
  namePrefix?: string
}

export interface ProcessingResult {
  success: boolean
  error?: string
  originalSize?: ImageDimensions
  finalSize?: ImageDimensions
  wasResized?: boolean
  wasUpscaled?: boolean
  scaleFactor?: number
  downloadUrl?: string
  processedName?: string
}

export function calculateUpscaleFactor(
  currentSize: ImageDimensions, 
  targetMaxDimension: number = 2560
): number {
  const maxCurrent = Math.max(currentSize.width, currentSize.height)
  if (maxCurrent >= targetMaxDimension) {
    return 1.0 // No upscaling needed
  }
  return targetMaxDimension / maxCurrent
}

export function calculateResizeDimensions(
  originalSize: ImageDimensions,
  maxDimension: number
): { dimensions: ImageDimensions; wasResized: boolean } {
  const maxOriginal = Math.max(originalSize.width, originalSize.height)
  
  if (maxOriginal <= maxDimension) {
    return {
      dimensions: originalSize,
      wasResized: false
    }
  }

  const scaleFactor = maxDimension / maxOriginal
  return {
    dimensions: {
      width: Math.round(originalSize.width * scaleFactor),
      height: Math.round(originalSize.height * scaleFactor)
    },
    wasResized: true
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/tiff',
    'image/gif'
  ]

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported formats: JPEG, PNG, WebP, AVIF, BMP, TIFF, GIF`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum size: ${formatFileSize(maxSize)}`
    }
  }

  return { valid: true }
}

export function sanitizeFileName(filename: string): string {
  // Remove extension if present
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Replace spaces with underscores and remove special characters
  const sanitized = nameWithoutExt
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 50) // Limit length
  
  // Ensure it's not empty
  return sanitized || `image_${Date.now()}`
}

export function generateProcessedFileName(
  originalName: string,
  prefix?: string,
  index?: number
): string {
  if (prefix && index !== undefined) {
    return `${sanitizeFileName(prefix)}_${index + 1}`
  }
  
  if (index !== undefined) {
    return `image_${index + 1}`
  }
  
  return sanitizeFileName(originalName)
}

export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeImagePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}