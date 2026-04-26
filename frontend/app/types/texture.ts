export interface TextureMeta {
  id: string;
  owner_id: string;
  project_id: string | null;
  name: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export type TextureScope = 'global' | 'project';

export interface PendingTextureFile {
  file: File;
  name: string;
  width: number | null;
  height: number | null;
  /** Size in bytes */
  sizeBytes: number;
  /** Human-readable formatted size */
  sizeLabel: string;
  /** true when file exceeds the 5 MB limit */
  oversized: boolean;
  /** Upload status */
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}
