import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

/**
 * POST /api/feedback/upload-screenshots - Upload feedback screenshots
 *
 * Uploads screenshots to Supabase Storage and returns public URLs
 * Allows anonymous uploads for feedback purposes
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Received screenshot upload request')

    const formData = await request.formData()
    const files: File[] = []

    // Extract all files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('screenshot_') && value instanceof File) {
        files.push(value)
      }
    }

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No screenshots provided',
        },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_FILES} screenshots allowed`,
        },
        { status: 400 }
      )
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File ${file.name} exceeds maximum size of 5MB`,
          },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `File ${file.name} has invalid type. Allowed: PNG, JPEG, WebP`,
          },
          { status: 400 }
        )
      }
    }

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const uploadedUrls: string[] = []

    // Upload files to Supabase Storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop() || 'png'
      const fileName = `feedback-${timestamp}-${randomStr}-${i}.${extension}`

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Failed to upload screenshot:', {
          fileName: file.name,
          error: error.message,
        })
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('feedback-screenshots').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)

      console.log('Screenshot uploaded successfully:', {
        fileName,
        url: publicUrl,
      })
    }

    return NextResponse.json(
      {
        success: true,
        urls: uploadedUrls,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error uploading screenshots:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while uploading screenshots',
      },
      { status: 500 }
    )
  }
}
