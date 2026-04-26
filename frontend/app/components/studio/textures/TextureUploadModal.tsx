'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingTextureFile, TextureScope } from '@/types/texture';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return null;
  }
}

async function buildPendingFile(file: File): Promise<PendingTextureFile> {
  const dims = await readImageDimensions(file);
  const oversized = file.size > MAX_BYTES;
  return {
    file,
    name: file.name.replace(/\.[^.]+$/, ''),
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    sizeBytes: file.size,
    sizeLabel: formatBytes(file.size),
    oversized,
    status: oversized ? 'error' : 'pending',
    errorMessage: oversized ? `File exceeds 5 MB limit (${formatBytes(file.size)})` : undefined,
  };
}

interface TextureUploadModalProps {
  projectId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function TextureUploadModal({
  projectId,
  onClose,
  onComplete,
}: TextureUploadModalProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingTextureFile[]>([]);
  const [scope, setScope] = useState<TextureScope>('global');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const files = Array.from(rawFiles).filter(
      (f) => f.type.startsWith('image/'),
    );
    const pending = await Promise.all(files.map(buildPendingFile));
    setPendingFiles((prev) => {
      // Deduplicate by name + size
      const existing = new Set(prev.map((p) => `${p.file.name}:${p.file.size}`));
      return [...prev, ...pending.filter((p) => !existing.has(`${p.file.name}:${p.file.size}`))];
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer.files.length > 0) {
        void addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleRemove = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadableCount = pendingFiles.filter((f) => f.status === 'pending').length;

  const handleUpload = async () => {
    if (uploadableCount === 0) return;
    setIsUploading(true);

    const updated = [...pendingFiles];

    for (let i = 0; i < updated.length; i++) {
      const pf = updated[i];
      if (pf.status !== 'pending') continue;

      updated[i] = { ...pf, status: 'uploading' };
      setPendingFiles([...updated]);

      try {
        const fd = new FormData();
        fd.append('file', pf.file);
        fd.append('name', pf.name);
        if (pf.width != null) fd.append('width', String(pf.width));
        if (pf.height != null) fd.append('height', String(pf.height));
        if (scope === 'project') fd.append('project_id', projectId);

        const res = await fetch('/api/textures/upload', {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          updated[i] = {
            ...updated[i],
            status: 'error',
            errorMessage: data.error ?? `Upload failed (${res.status})`,
          };
        } else {
          updated[i] = { ...updated[i], status: 'done' };
        }
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Network error',
        };
      }

      setPendingFiles([...updated]);
    }

    setIsUploading(false);

    const anyDone = updated.some((f) => f.status === 'done');
    if (anyDone) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 w-full max-w-xl bg-vertra-surface border border-vertra-border/60 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vertra-border/40 shrink-0">
          <h2 className="text-sm font-semibold text-vertra-text">Upload Textures</h2>
          <Button variant="icon" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
              py-8 cursor-pointer transition-colors
              ${isDraggingOver
                ? 'border-vertra-cyan/60 bg-vertra-cyan/5'
                : 'border-vertra-border/50 hover:border-vertra-border/80 hover:bg-vertra-surface-alt/30'}
            `}
          >
            <Upload className="w-6 h-6 text-vertra-text-dim" />
            <p className="text-xs text-vertra-text-dim">
              Drop images here or <span className="text-vertra-cyan">click to browse</span>
            </p>
            <p className="text-xs text-vertra-text-dim/60">PNG, JPEG, WebP, GIF — max 5 MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* File list */}
          <AnimatePresence initial={false}>
            {pendingFiles.map((pf, idx) => (
              <motion.div
                key={`${pf.file.name}:${pf.file.size}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-start gap-3 rounded-lg border border-vertra-border/40 bg-vertra-surface-alt/40 px-3 py-2.5"
              >
                <ImageIcon className="w-4 h-4 mt-0.5 shrink-0 text-vertra-text-dim" />
                <div className="flex-1 min-w-0">
                  {/* Editable name */}
                  <input
                    value={pf.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingFiles((prev) =>
                        prev.map((f, i) => (i === idx ? { ...f, name: val } : f)),
                      );
                    }}
                    disabled={pf.status === 'uploading' || pf.status === 'done'}
                    className="w-full bg-transparent text-xs font-medium text-vertra-text outline-none focus:text-vertra-cyan truncate"
                  />
                  <p className="text-xs text-vertra-text-dim mt-0.5">
                    {pf.width && pf.height ? `${pf.width}×${pf.height}px · ` : ''}
                    {pf.sizeLabel} · {pf.file.type}
                  </p>
                  {pf.status === 'error' && pf.errorMessage && (
                    <p className="text-xs text-vertra-error mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {pf.errorMessage}
                    </p>
                  )}
                </div>
                {/* Status indicator */}
                <div className="shrink-0 flex items-center gap-1">
                  {pf.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-vertra-cyan" />
                  )}
                  {pf.status === 'done' && (
                    <CheckCircle2 className="w-4 h-4 text-vertra-success" />
                  )}
                  {(pf.status === 'pending' || pf.status === 'error') && (
                    <Button
                      variant="icon"
                      size="sm"
                      onClick={() => handleRemove(idx)}
                      disabled={isUploading}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Scope selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-vertra-text-dim mb-2">
              Storage scope
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['global', 'project'] as TextureScope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    scope === s
                      ? 'border-vertra-cyan/60 bg-vertra-cyan/10 text-vertra-cyan'
                      : 'border-vertra-border/40 bg-vertra-surface-alt/40 text-vertra-text-dim hover:border-vertra-border/70'
                  }`}
                >
                  <p className="text-xs font-semibold">
                    {s === 'global' ? 'Global' : 'Project only'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    {s === 'global'
                      ? 'Available across all projects'
                      : 'Only visible in this project'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-vertra-border/40 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleUpload()}
            disabled={uploadableCount === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Uploading…
              </>
            ) : (
              `Upload ${uploadableCount > 0 ? uploadableCount : ''} texture${uploadableCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
