'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  /**
   * Upload function that takes a File and returns a Promise<string> with the uploaded image URL
   * Placeholder implementation that should be replaced with actual upload logic
   */
  onUpload?: (file: File) => Promise<string>;
}

/**
 * Default upload placeholder function
 * Replace this with your actual upload implementation (e.g., to S3, Cloudinary, IPFS, etc.)
 */
const defaultUploadPlaceholder = async (file: File): Promise<string> => {
  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // For now, create a local object URL
  // In production, this should upload to your storage service and return the public URL
  const url = URL.createObjectURL(file);

  console.warn(
    '[ImageUpload] Using placeholder upload function. ' +
    'Please implement actual file upload to your storage service.'
  );

  return url;
};

export function ImageUpload({
  value,
  onChange,
  disabled,
  error,
  onUpload = defaultUploadPlaceholder
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return false;
    }

    return true;
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const imageUrl = await onUpload(file);
      onChange(imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setUploadError(errorMessage);
      console.error('[ImageUpload] Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    onChange('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        /* Preview State */
        <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 bg-muted/5">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
          {!disabled && !isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-colors',
            'flex flex-col items-center justify-center p-8 cursor-pointer',
            isDragging && 'border-primary bg-primary/5',
            !isDragging && 'border-muted-foreground/25 bg-muted/5 hover:bg-muted/10',
            (disabled || isUploading) && 'cursor-not-allowed opacity-60',
            error && 'border-destructive'
          )}
          onClick={!disabled && !isUploading ? handleBrowse : undefined}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium">Uploading image...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted p-4 mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Drop image here' : 'Drag & drop image here'}
              </p>
              <p className="text-xs text-muted-foreground mb-3">or</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowse();
                }}
                disabled={disabled}
              >
                Browse Files
              </Button>
              <p className="text-xs text-muted-foreground/70 mt-4">
                PNG, JPG, GIF up to 5MB
              </p>
            </>
          )}
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-sm text-destructive">{error || uploadError}</p>
      )}
    </div>
  );
}
