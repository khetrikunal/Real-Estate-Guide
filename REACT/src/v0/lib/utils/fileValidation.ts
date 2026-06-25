// Utility functions for validating file uploads
// Allowed extensions: pdf, jpg, jpeg, png, doc, docx
// Max size: 10 MB (same as other uploads in the app)

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
];

/**
 * Returns an error message string if the file is invalid, otherwise null.
 */
export function validateFile(file: File): string | null {
  if (file.size === 0) {
    return 'File is empty (0 bytes).';
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return `File size exceeds the maximum allowed size of ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB.`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type .${ext}. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  return null;
}
