# File Optimization System

## Overview
PolSpeak automatically optimizes all uploaded files to reduce storage usage and improve performance.

## File Size Limits

### Images
- **Maximum**: 500 KB
- **Processing**:
  - Automatically compressed before upload
  - Converted to WebP format (modern, efficient)
  - Resized to max 1920px (width or height)
  - Quality: 80% (reduced to 60% if still too large)
- **Result**: Typically 70-90% size reduction

### PDFs
- **Maximum**: 5 MB
- **Processing**: Validation only (no compression)

### Audio Files
- **Maximum**: 5 MB
- **Processing**: Validation only (no compression)

## How It Works

### Client-Side Optimization (browser-image-compression)
1. User selects file
2. System automatically:
   - Compresses images to WebP
   - Validates file sizes
   - Shows compression results in console
3. Uploads optimized file to Supabase

### Benefits
- **Storage Savings**: 1 GB free tier → thousands of images
- **Faster Loading**: Smaller files = faster page loads
- **Better UX**: Automatic, transparent to users
- **Cost Efficient**: Free plan lasts much longer

## Implementation

All file uploads go through `processFileForUpload()`:

```typescript
import { processFileForUpload } from '@/lib/image-compression';

// Process file before upload
const { processedFile, valid, message, compressionRatio } =
  await processFileForUpload(file);

if (!valid) {
  showToast(message, "error");
  return;
}

// Upload compressed file
await uploadFile(processedFile, path);
```

## Where Compression is Applied

✅ Lesson module images (quiz, image module, etc.)
✅ Matching exercise images
✅ Audio/Image item uploads
✅ Library file uploads (drag & drop + button)
✅ Profile photo uploads

## Monitoring

Check browser console for compression logs:
```
Image compressed: 2.3 MB → 245 KB (89% reduction)
```

## Future Enhancements

Potential improvements:
- Server-side compression fallback
- Video compression support
- PDF compression (reduce resolution)
- Progress indicators during compression
- Batch upload optimization
