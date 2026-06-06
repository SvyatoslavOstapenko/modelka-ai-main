/**
 * Shared types for Product-to-Model workspace components
 */

export type GenerationStatus = 'idle' | 'processing' | 'success' | 'error';

export interface UploadedFile {
  file: File;
  preview: string;
  s3Key?: string;
  mimeType?: string;
}

export interface GenerationSettings {
  description: string;
  aspectRatio: string;
  resolution: string;
  numVariants: number;
}

export interface OptionalAssets {
  modelImage: File | null;
  faceReferenceImage: File | null;
  imagePrompt: File | null;
  backgroundReference: File | null;
}
