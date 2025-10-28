import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, fileName, currentSize, targetSize } = await request.json()
    
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: 'REPLICATE_API_TOKEN not configured'
      })
    }

    // Calculate scale factor
    const maxCurrentDimension = Math.max(currentSize.width, currentSize.height)
    const scaleFactor = targetSize / maxCurrentDimension

    console.log(`🔬 UPSCALE START: ${fileName}`)
    console.log(`📐 Current: ${maxCurrentDimension}px, Target: ${targetSize}px, Scale: ${scaleFactor}x`)

    if (scaleFactor <= 1) {
      return NextResponse.json({
        success: false,
        error: `Image already at target size (${maxCurrentDimension}px >= ${targetSize}px)`
      })
    }

    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    console.log(`📥 Downloaded image: ${imageBuffer.byteLength} bytes`)

    console.log(`📤 Sending to Replicate API...`)
    console.log(`🔑 Token: ${apiToken.substring(0, 8)}...`)

    // Convert to data URL for Replicate
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    console.log(`📤 Data URL length: ${dataUrl.length}`)

    // Use direct API call like the curl example
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: {
          image: dataUrl,
          scale: Math.min(scaleFactor, 4),
          face_enhance: false
        }
      })
    })

    const output = await replicateResponse.json()
    console.log(`🔍 REPLICATE OUTPUT:`, output)
    console.log(`🔍 REPLICATE STATUS:`, replicateResponse.status)

    // Try to handle FileOutput object like in Python example
    if (output && typeof output === 'object' && 'read' in output && typeof output.read === 'function') {
      console.log(`📖 Found FileOutput object with read() method`)
      try {
        const fileData = await output.read()
        console.log(`📖 Read ${fileData.length} bytes from FileOutput`)
        // This would be binary data, we need to convert to URL or base64
        return NextResponse.json({
          success: true,
          scaleFactor: scaleFactor,
          finalSize: {
            width: Math.round(currentSize.width * scaleFactor),
            height: Math.round(currentSize.height * scaleFactor)
          },
          downloadUrl: `data:image/png;base64,${Buffer.from(fileData).toString('base64')}`,
          replicateOutput: 'FileOutput with read() method'
        })
      } catch (readError) {
        console.log(`❌ Error reading FileOutput: ${readError}`)
      }
    }

    // If output is empty object, let's try different approaches
    if (output && typeof output === 'object' && Object.keys(output).length === 0) {
      console.log(`❌ Empty object returned from Replicate`)
      return NextResponse.json({
        success: false,
        error: 'Replicate returned empty object - this might be a model or API issue',
        debugOutput: output,
        troubleshooting: 'Check Replicate model status and API token',
        replicateRawOutput: output
      })
    }

    // Handle Replicate API response
    if (!replicateResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Replicate API error: ${replicateResponse.status}`,
        replicateRawOutput: output
      })
    }

    // Extract URL from Replicate response
    let resultUrl: string | null = null
    
    if (output && (output.status === 'succeeded' || output.status === 'processing') && output.output) {
      if (typeof output.output === 'string') {
        resultUrl = output.output
        console.log(`✅ Found URL in output.output: ${resultUrl} (status: ${output.status})`)
      } else if (Array.isArray(output.output) && output.output.length > 0) {
        resultUrl = output.output[0]
        console.log(`✅ Found URL in output.output[0]: ${resultUrl} (status: ${output.status})`)
      }
    } else if (output && output.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: `Replicate prediction failed: ${output.error || 'Unknown error'}`,
        replicateRawOutput: output
      })
    } else {
      console.log(`❌ Unexpected output format or status: ${output?.status}`)
    }

    if (!resultUrl) {
      return NextResponse.json({
        success: false,
        error: 'No valid URL in Replicate response',
        debugOutput: output,
        replicateRawOutput: output
      })
    }

    // Return the upscaled result
    return NextResponse.json({
      success: true,
      scaleFactor: scaleFactor,
      finalSize: {
        width: Math.round(currentSize.width * scaleFactor),
        height: Math.round(currentSize.height * scaleFactor)
      },
      downloadUrl: resultUrl,
      replicateRawOutput: output
    })

  } catch (error) {
    console.error('🔥 UPSCALE ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    }, { status: 500 })
  }
}