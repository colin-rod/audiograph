import JSZip from 'jszip'

/**
 * Maximum allowed ZIP file size (100MB)
 */
const MAX_ZIP_SIZE = 100 * 1024 * 1024

/**
 * Patterns to identify Spotify JSON files
 * Matches: StreamingHistory*.json, endsong*.json (case-insensitive)
 */
const SPOTIFY_FILE_PATTERNS = [
  /StreamingHistory.*\.json$/i,
  /endsong.*\.json$/i
]

export type ExtractedFile = {
  filename: string
  content: string
}

export type ExtractSuccess = {
  success: true
  files: ExtractedFile[]
}

export type ExtractError = {
  success: false
  error: string
}

export type ExtractResult = ExtractSuccess | ExtractError

/**
 * Checks if a filename matches any Spotify file pattern
 */
function isSpotifyFile(filename: string): boolean {
  const basename = filename.split('/').pop() || ''
  return SPOTIFY_FILE_PATTERNS.some(pattern => pattern.test(basename))
}

/**
 * Extracts Spotify JSON files from a ZIP archive
 *
 * @param file - The ZIP file to extract
 * @returns Result containing extracted files or error message
 */
export async function extractJsonFromZip(file: File): Promise<ExtractResult> {
  // Validate file size
  if (file.size > MAX_ZIP_SIZE) {
    return {
      success: false,
      error: `File size exceeds maximum allowed size of 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
    }
  }

  try {
    // Load and parse ZIP file
    const zip = new JSZip()
    const arrayBuffer = await file.arrayBuffer()
    const zipContents = await zip.loadAsync(arrayBuffer)

    // Extract all Spotify JSON files
    const extractedFiles: ExtractedFile[] = []

    for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
      // Skip directories
      if (zipEntry.dir) {
        continue
      }

      // Only process Spotify JSON files
      if (!isSpotifyFile(filename)) {
        continue
      }

      // Extract file content as text
      try {
        const content = await zipEntry.async('text')
        extractedFiles.push({
          filename,
          content
        })
      } catch (error) {
        console.error(`Failed to extract ${filename}:`, error)
        // Continue processing other files
      }
    }

    // Validate that we found at least one Spotify JSON file
    if (extractedFiles.length === 0) {
      return {
        success: false,
        error: 'No Spotify JSON files found in the ZIP archive. Expected files like StreamingHistory*.json or endsong*.json.'
      }
    }

    return {
      success: true,
      files: extractedFiles
    }

  } catch (error) {
    console.error('Failed to extract ZIP file:', error)
    return {
      success: false,
      error: error instanceof Error
        ? `Failed to extract ZIP file: ${error.message}`
        : 'Failed to extract ZIP file. The file may be corrupted.'
    }
  }
}
