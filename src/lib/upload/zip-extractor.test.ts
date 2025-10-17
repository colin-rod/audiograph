import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { extractJsonFromZip } from './zip-extractor'

describe('extractJsonFromZip', () => {
  it('extracts valid JSON files from ZIP', async () => {
    // Create a mock ZIP file with Spotify JSON files
    const zip = new JSZip()
    const jsonContent1 = JSON.stringify([
      { ts: '2024-01-01T00:00:00Z', artist: 'Test Artist', track: 'Test Track', ms_played: 180000 }
    ])
    const jsonContent2 = JSON.stringify([
      { endTime: '2024-01-02T00:00:00Z', artistName: 'Another Artist', trackName: 'Another Track', msPlayed: 240000 }
    ])

    zip.file('StreamingHistory_music_0.json', jsonContent1)
    zip.file('StreamingHistory_music_1.json', jsonContent2)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFile = new File([zipBlob], 'spotify_data.zip', { type: 'application/zip' })

    const result = await extractJsonFromZip(zipFile)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.files).toHaveLength(2)
      expect(result.files[0].filename).toBe('StreamingHistory_music_0.json')
      expect(result.files[0].content).toBe(jsonContent1)
      expect(result.files[1].filename).toBe('StreamingHistory_music_1.json')
      expect(result.files[1].content).toBe(jsonContent2)
    }
  })

  it('filters for Spotify file patterns (StreamingHistory*, endsong*)', async () => {
    const zip = new JSZip()
    const spotifyContent = JSON.stringify([{ ts: '2024-01-01T00:00:00Z' }])

    zip.file('StreamingHistory_music_0.json', spotifyContent)
    zip.file('endsong_0.json', spotifyContent)
    zip.file('ReadMe.pdf', 'This is a PDF file')
    zip.file('some_other_file.json', '{"data": "ignored"}')
    zip.file('MyData/StreamingHistory_music_1.json', spotifyContent)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFile = new File([zipBlob], 'spotify_data.zip', { type: 'application/zip' })

    const result = await extractJsonFromZip(zipFile)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.files).toHaveLength(3)
      const filenames = result.files.map(f => f.filename)
      expect(filenames).toContain('StreamingHistory_music_0.json')
      expect(filenames).toContain('endsong_0.json')
      expect(filenames).toContain('MyData/StreamingHistory_music_1.json')
      expect(filenames).not.toContain('ReadMe.pdf')
      expect(filenames).not.toContain('some_other_file.json')
    }
  })

  it('rejects ZIP with no JSON files', async () => {
    const zip = new JSZip()
    zip.file('ReadMe.pdf', 'This is a PDF file')
    zip.file('Info.txt', 'Some info')

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFile = new File([zipBlob], 'empty.zip', { type: 'application/zip' })

    const result = await extractJsonFromZip(zipFile)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No Spotify JSON files found')
    }
  })

  it('rejects ZIP larger than 100MB', async () => {
    const largeFile = new File([new ArrayBuffer(101 * 1024 * 1024)], 'large.zip', {
      type: 'application/zip'
    })

    const result = await extractJsonFromZip(largeFile)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('File size exceeds maximum')
      expect(result.error).toContain('100MB')
    }
  })

  it('handles corrupted ZIP gracefully', async () => {
    const corruptedData = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF])
    const corruptedFile = new File([corruptedData], 'corrupted.zip', {
      type: 'application/zip'
    })

    const result = await extractJsonFromZip(corruptedFile)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('handles empty ZIP file', async () => {
    const zip = new JSZip()
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFile = new File([zipBlob], 'empty.zip', { type: 'application/zip' })

    const result = await extractJsonFromZip(zipFile)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No Spotify JSON files found')
    }
  })

  it('extracts files from nested directories', async () => {
    const zip = new JSZip()
    const jsonContent = JSON.stringify([{ ts: '2024-01-01T00:00:00Z' }])

    zip.file('MyData/StreamingHistory_music_0.json', jsonContent)
    zip.file('MyData/Audio/endsong_0.json', jsonContent)
    zip.file('deep/nested/path/StreamingHistory_music_1.json', jsonContent)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFile = new File([zipBlob], 'nested.zip', { type: 'application/zip' })

    const result = await extractJsonFromZip(zipFile)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.files).toHaveLength(3)
      expect(result.files.some(f => f.filename.includes('MyData'))).toBe(true)
    }
  })
})
