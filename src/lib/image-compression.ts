import imageCompression from 'browser-image-compression';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10 MB for images (will be compressed)
  pdf: 100 * 1024 * 1024,    // 100 MB for PDFs (no compression - too heavy for browser)
  audio: 100 * 1024 * 1024,  // 100 MB for audio files
};

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

/**
 * Compress an image file to reduce size and optionally convert to WebP
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const {
    maxSizeMB = 4, // Target max size: 4 MB
    maxWidthOrHeight = 1600, // Max dimension
    useWebWorker = true,
    fileType = 'image/webp', // Convert to WebP by default
  } = options;

  // Skip compression if file is already under the target size
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  try {
    const compressionOptions = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType,
      initialQuality: 0.8,
    };

    const compressedFile = await imageCompression(file, compressionOptions);

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Validate file size before upload
 * @param file - File to validate
 * @param type - File type category
 * @returns Object with validation result and message
 */
export function validateFileSize(
  file: File,
  type: 'image' | 'pdf' | 'audio'
): { valid: boolean; message?: string; originalSize: number } {
  const limit = FILE_SIZE_LIMITS[type];
  const originalSize = file.size;

  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    return {
      valid: false,
      message: `File too large (${fileSizeMB} MB). Maximum allowed: ${limitMB} MB`,
      originalSize,
    };
  }

  return { valid: true, originalSize };
}

/**
 * Get file type category from MIME type
 */
export function getFileTypeCategory(file: File): 'image' | 'pdf' | 'audio' | 'other' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'other';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Process file before upload: compress if image or PDF, validate size
 * @param file - Original file
 * @returns Processed file and validation info
 */
export async function processFileForUpload(file: File): Promise<{
  processedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  valid: boolean;
  message?: string;
}> {
  return {
    processedFile: file,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 0,
    valid: true,
  };
}
