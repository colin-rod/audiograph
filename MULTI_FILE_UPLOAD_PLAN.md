# Multi-File Upload Implementation Plan

## Current Flow (ZIP)

```
User uploads ZIP
  ↓
API extracts JSON files from ZIP (complex, error-prone)
  ↓
Queue jobs for each file
  ↓
Worker processes jobs
```

**Problems**:
- ZIP extraction complexity
- SSL certificate issues with pg-boss
- Hard to show progress
- Files hidden inside ZIP
- Need to filter for correct files
- Compression/decompression overhead

## Proposed Flow (Multiple JSON Files)

```
User selects multiple JSON files
  ↓
Show list of selected files (better UX)
  ↓
Upload all files at once
  ↓
Queue jobs for each file
  ↓
Worker processes jobs
```

**Benefits**:
- ✅ Simpler code (remove zip-extractor entirely)
- ✅ Better UX (see file list before upload)
- ✅ Faster (no extraction step)
- ✅ More reliable (no compression edge cases)
- ✅ Better error messages (per-file validation)
- ✅ Progress tracking per file
- ✅ Mobile friendly

## Implementation Steps

### 1. Create New API Endpoint

**File**: `src/app/api/uploads/json/route.ts`

```typescript
POST /api/uploads/json
- Accept multiple JSON files via multipart/form-data
- Validate each file is JSON
- Validate file names match Spotify patterns
- Create upload job
- Queue processing for each file
```

### 2. Update Upload Page

**File**: `src/app/upload/page.tsx`

```typescript
// Change from single ZIP input to multiple JSON input
<input
  type="file"
  accept=".json"
  multiple
  onChange={handleFilesSelected}
/>

// Show file list before upload
<FileList>
  {files.map(file => (
    <FileItem key={file.name}>
      {file.name} ({formatBytes(file.size)})
    </FileItem>
  ))}
</FileList>
```

### 3. Update Backend Processing

**Keep existing**:
- Worker (`upload-processor.ts`)
- Queue client
- Processor logic

**Remove**:
- `zip-extractor.ts`
- `zip-extractor.test.ts`
- ZIP-related dependencies

### 4. Migration Strategy

**Option A: Replace ZIP entirely**
- Remove ZIP upload option
- Only support multiple JSON files
- Simpler, cleaner

**Option B: Support both (recommended)**
- Keep ZIP for backward compatibility
- Add new JSON upload option
- Let users choose
- Gradually migrate users

## User Experience Comparison

### Current (ZIP)
```
1. User downloads ZIP from Spotify
2. User uploads entire ZIP
3. [Black box - no visibility]
4. Processing starts
```

### Proposed (Multi-JSON)
```
1. User downloads ZIP from Spotify
2. User extracts ZIP themselves
3. User selects JSON files (sees list)
4. User can remove unwanted files
5. Upload starts with progress bar
6. Processing starts
```

## File Validation

Since users select files manually, add validation:

```typescript
function isSpotifyFile(filename: string): boolean {
  const patterns = [
    /Streaming_History_Audio.*\.json$/i,
    /StreamingHistory.*\.json$/i,
    /endsong.*\.json$/i
  ]
  return patterns.some(p => p.test(filename))
}
```

Show warning if non-Spotify files selected:
```
⚠️ Some files don't match Spotify format and will be skipped:
- ReadMe.pdf
- Info.txt
```

## Code Changes Summary

### New Files
- `src/app/api/uploads/json/route.ts` - New multi-file endpoint

### Modified Files
- `src/app/upload/page.tsx` - Update UI for multiple files
- `src/lib/upload/spotify-validator.ts` - Add file name validation

### Removed Files
- `src/lib/upload/zip-extractor.ts`
- `src/lib/upload/zip-extractor.test.ts`

### Removed Dependencies
- `jszip` package

## Testing Plan

1. **Unit Tests**
   - File name validation
   - API endpoint with multiple files
   - Error handling for invalid files

2. **Integration Tests**
   - Upload 1 JSON file
   - Upload multiple JSON files
   - Upload mix of valid/invalid files
   - Upload large files

3. **Manual Testing**
   - Real Spotify export
   - Mobile device upload
   - Progress tracking
   - Error scenarios

## Rollout Plan

### Phase 1: Build (1-2 hours)
- Create new JSON upload endpoint
- Update upload page UI
- Add file validation

### Phase 2: Test (30 mins)
- Test with real Spotify data
- Verify worker processes correctly
- Check error handling

### Phase 3: Deploy (15 mins)
- Deploy to Vercel
- Verify in production
- Monitor logs

### Phase 4: Cleanup (30 mins)
- Remove ZIP code if not needed
- Update documentation
- Remove unused dependencies

## Recommendation

**Implement Option B (support both)** for now:

1. Add multi-JSON upload as primary method
2. Keep ZIP as fallback for users who prefer it
3. Monitor usage
4. Remove ZIP after 1-2 weeks if not used

This gives us:
- Safer migration
- User choice
- Fallback option
- Time to validate new flow

## Next Steps

Would you like me to:
1. ✅ **Implement the multi-file JSON upload** (recommended)
2. Keep both ZIP and JSON options
3. Show you a prototype first

Let me know and I'll start implementing!
