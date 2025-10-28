import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed')

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
  if (!existsSync(PROCESSED_DIR)) {
    await mkdir(PROCESSED_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  const consoleLogs: string[] = []
  const originalLog = console.log
  console.log = (...args) => {
    consoleLogs.push(args.join(' '))
    originalLog(...args)
  }

  try {
    await ensureDirectories()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const settingsString = formData.get('settings') as string
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        success: false, 
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: 50MB)` 
      }, { status: 400 })
    }

    const settings = JSON.parse(settingsString)
    const { fileName, maxDimension = 1300, enableUpscaling = true, targetSize = 2560 } = settings

    // Save original file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const timestamp = Date.now()
    const originalFilePath = path.join(UPLOAD_DIR, `${timestamp}_${file.name}`)
    await writeFile(originalFilePath, buffer)

    // Process image with Sharp
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid image file' 
      }, { status: 400 })
    }

    const originalSize = { width: metadata.width, height: metadata.height }
    let processedImage = image

    // Convert to PNG and resize if needed
    const maxCurrentDimension = Math.max(originalSize.width, originalSize.height)
    let finalSize = originalSize
    let wasResized = false

    if (maxCurrentDimension > maxDimension) {
      const scaleFactor = maxDimension / maxCurrentDimension
      const newWidth = Math.round(originalSize.width * scaleFactor)
      const newHeight = Math.round(originalSize.height * scaleFactor)
      
      processedImage = processedImage.resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      })
      
      finalSize = { width: newWidth, height: newHeight }
      wasResized = true
    }

    // Convert to PNG
    processedImage = processedImage.png({ quality: 100, compressionLevel: 6 })

    // Save processed image
    const processedFileName = `${fileName}.png`
    const processedFilePath = path.join(PROCESSED_DIR, `${timestamp}_${processedFileName}`)
    await processedImage.toFile(processedFilePath)

    // Generate URLs using API endpoint
    const processedUrl = `/api/serve-image/${timestamp}_${processedFileName}`
    
    let result = {
      success: true,
      processedName: fileName,
      originalSize,
      finalSize,
      wasResized,
      wasUpscaled: false,
      scaleFactor: 1,
      downloadUrl: processedUrl,
      preview: processedUrl
    }

    // If upscaling is enabled and image can be upscaled
    const finalMaxDimension = Math.max(finalSize.width, finalSize.height)
    console.log(`Upscaling check: enableUpscaling=${enableUpscaling}, finalMaxDimension=${finalMaxDimension}, targetSize=${targetSize}`)
    
    if (enableUpscaling && finalMaxDimension < targetSize) {
      try {
        const upscaleResult = await upscaleWithReplicate(processedFilePath, fileName, finalSize, targetSize)
        if (upscaleResult.success) {
          result = {
            ...result,
            ...upscaleResult,
            downloadUrl: upscaleResult.downloadUrl || result.downloadUrl,
            preview: upscaleResult.downloadUrl || result.preview
          }
        }
      } catch (error) {
        console.error('Upscaling failed:', error)
        // Continue with non-upscaled version
      }
    }

    // Restore original console.log
    console.log = originalLog

    return NextResponse.json({
      ...result,
      consoleLogs: consoleLogs
    })

  } catch (error) {
    console.log = originalLog
    console.error('Processing error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      consoleLogs: consoleLogs
    }, { status: 500 })
  }
}

async function upscaleWithReplicate(
  imagePath: string, 
  fileName: string, 
  currentSize: { width: number; height: number },
  targetSize: number
) {
  const apiToken = process.env.REPLICATE_API_TOKEN
  
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured')
  }

  // Calculate scale factor
  const maxCurrentDimension = Math.max(currentSize.width, currentSize.height)
  const scaleFactor = targetSize / maxCurrentDimension

  console.log(`Upscale check: current=${maxCurrentDimension}, target=${targetSize}, scale=${scaleFactor}`)

  if (scaleFactor <= 1) {
    return {
      success: false,
      error: `Image already at target size or larger (current: ${maxCurrentDimension}px, target: ${targetSize}px)`
    }
  }

  try {
    // Import Replicate dynamically
    const Replicate = (await import('replicate')).default
    const replicate = new Replicate({
      auth: apiToken,
    })

    // Read the processed image file
    const fs = await import('fs')
    const imageBuffer = fs.readFileSync(imagePath)

    // Create a blob from the buffer
    const imageFile = new File([imageBuffer], `${fileName}.png`, { type: 'image/png' })

    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: imageFile,
          scale: Math.min(scaleFactor, 4), // Real-ESRGAN max scale is 4
          face_enhance: false
        }
      }
    )

    // Debug output from Replicate
    console.log('🔍 REPLICATE OUTPUT:', JSON.stringify({
      type: typeof output,
      isArray: Array.isArray(output),
      output: output,
      keys: output && typeof output === 'object' ? Object.keys(output) : null
    }))

    // Handle both string and object responses from Replicate
    let imageUrl: string | null = null
    
    if (typeof output === 'string') {
      imageUrl = output
      console.log('✅ Found URL as string:', imageUrl)
    } else if (output && typeof output === 'object') {
      // If it's an object, try to extract URL from various possible properties
      if ('url' in output && typeof output.url === 'string') {
        imageUrl = output.url
        console.log('✅ Found URL in output.url:', imageUrl)
      } else if ('stringValue' in output && typeof output.stringValue === 'string') {
        imageUrl = output.stringValue
        console.log('✅ Found URL in output.stringValue:', imageUrl)
      } else if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        imageUrl = output[0]
        console.log('✅ Found URL in output[0]:', imageUrl)
      } else {
        console.log('❌ No URL found in object output')
      }
    } else {
      console.log('❌ Output is neither string nor object')
    }

    if (imageUrl) {
      // Download the upscaled image
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to download upscaled image: ${response.statusText}`)
      }

      const upscaledBuffer = Buffer.from(await response.arrayBuffer())
      
      // Get upscaled image dimensions
      const upscaledImage = sharp(upscaledBuffer)
      const upscaledMetadata = await upscaledImage.metadata()
      
      if (!upscaledMetadata.width || !upscaledMetadata.height) {
        throw new Error('Invalid upscaled image')
      }

      // Save upscaled image
      const timestamp = Date.now()
      const upscaledFileName = `upscaled_${timestamp}_${fileName}.png`
      const upscaledPath = path.join(PROCESSED_DIR, upscaledFileName)
      await writeFile(upscaledPath, upscaledBuffer)

      return {
        success: true,
        wasUpscaled: true,
        scaleFactor: scaleFactor,
        finalSize: { 
          width: upscaledMetadata.width, 
          height: upscaledMetadata.height 
        },
        downloadUrl: `/api/serve-image/${upscaledFileName}`
      }
    }

    throw new Error('No output from Replicate')

  } catch (error) {
    console.error('Replicate upscaling error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upscaling error'
    }
  }
}