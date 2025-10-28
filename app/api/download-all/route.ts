import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'
import archiver from 'archiver'

const PROCESSED_DIR = path.join(process.cwd(), 'public', 'processed')

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json()
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images specified' }, { status: 400 })
    }

    console.log(`📦 Creating ZIP with ${images.length} images:`, images.map(img => ({ name: img.name, url: img.downloadUrl })))

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Set up response headers for file download
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="processed_images_${Date.now()}.zip"`
    })

    // Create a readable stream for the response
    const { readable, writable } = new TransformStream()
    
    // Pipe archive to writable stream
    const writer = writable.getWriter()
    
    archive.on('data', (chunk) => {
      writer.write(new Uint8Array(chunk))
    })
    
    archive.on('end', () => {
      writer.close()
    })
    
    archive.on('error', (err) => {
      console.error('Archive error:', err)
      writer.abort(err)
    })

    // Add files to archive
    for (const image of images) {
      const fileName = `${image.name}.png`
      
      try {
        if (image.downloadUrl && image.downloadUrl.startsWith('http')) {
          // Download from external URL (Replicate)
          console.log(`📥 Downloading from external URL: ${image.downloadUrl}`)
          const response = await fetch(image.downloadUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            archive.append(buffer, { name: fileName })
            console.log(`✅ Added ${fileName} from external URL`)
          } else {
            console.error(`❌ Failed to download ${fileName}: ${response.status}`)
          }
        } else {
          // Find local file in processed directory
          console.log(`📁 Looking for local file: ${image.name}`)
          const files = await readdir(PROCESSED_DIR)
          const matchingFile = files.find(file => file.includes(image.name))
          
          if (matchingFile) {
            const filePath = path.join(PROCESSED_DIR, matchingFile)
            
            if (existsSync(filePath)) {
              const fileStream = createReadStream(filePath)
              archive.append(fileStream, { name: fileName })
              console.log(`✅ Added ${fileName} from local file`)
            }
          } else {
            console.error(`❌ Local file not found for ${image.name}`)
          }
        }
      } catch (error) {
        console.error(`Error adding file ${fileName} to archive:`, error)
        // Continue with other files
      }
    }

    // Finalize the archive
    archive.finalize()

    // Clean up files after ZIP creation
    console.log('📦 ZIP creation finished, scheduling cleanup in 5 seconds...')
    setTimeout(async () => {
      try {
        console.log('🧹 Starting cleanup process...')
        const { unlink } = await import('fs/promises')
        
        // Clean uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        console.log(`📂 Checking uploads directory: ${uploadsDir}`)
        try {
          const uploadFiles = await readdir(uploadsDir)
          console.log(`📁 Found ${uploadFiles.length} files in uploads:`, uploadFiles)
          for (const file of uploadFiles) {
            const filePath = path.join(uploadsDir, file)
            await unlink(filePath)
            console.log(`🗑️ Deleted: ${filePath}`)
          }
          console.log(`✅ Deleted ${uploadFiles.length} files from uploads`)
        } catch (err) {
          console.log('❌ Uploads cleanup error:', err)
        }

        // Clean processed directory
        console.log(`📂 Checking processed directory: ${PROCESSED_DIR}`)
        try {
          const processedFiles = await readdir(PROCESSED_DIR)
          console.log(`📁 Found ${processedFiles.length} files in processed:`, processedFiles)
          for (const file of processedFiles) {
            const filePath = path.join(PROCESSED_DIR, file)
            await unlink(filePath)
            console.log(`🗑️ Deleted: ${filePath}`)
          }
          console.log(`✅ Deleted ${processedFiles.length} files from processed`)
        } catch (err) {
          console.log('❌ Processed cleanup error:', err)
        }
        
        console.log('🎉 Cleanup completed successfully!')
      } catch (error) {
        console.error('💥 Cleanup fatal error:', error)
      }
    }, 5000) // 5 second delay to ensure download started

    return new Response(readable, { headers })

  } catch (error) {
    console.error('Download all error:', error)
    return NextResponse.json({ 
      error: 'Failed to create archive' 
    }, { status: 500 })
  }
}