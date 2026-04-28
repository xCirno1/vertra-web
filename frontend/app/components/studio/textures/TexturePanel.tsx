'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ImageIcon, Info, Pencil, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelHeader } from '@/components/ui/panel-header';
import { Skeleton } from '@/components/ui/skeleton';
import TextureUploadModal from './TextureUploadModal';
import { evictCachedTexture, evictPresignedUrl, getPresignedUrl } from '@/lib/storage/texture-cache';
import type { TextureMeta } from '@/types/texture';

interface TexturePanelProps {
  projectId: string;
  /** ID of the currently selected engine object, or undefined */
  selectedObjectId?: number;
  /** Called when a texture should be applied to the selected object */
  onApplyTexture?: (objectId: number, textureId: string) => void;
  onClose?: () => void;
}

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 200;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TexturePanel({
  projectId,
  selectedObjectId,
  onApplyTexture,
  onClose,
}: TexturePanelProps) {
  const [textures, setTextures] = useState<TextureMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [detailTexture, setDetailTexture] = useState<TextureMeta | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  // Per-render URL map — populated from the module-level presigned URL cache.
  // Storing in state lets React re-render cards as URLs resolve.
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(DEFAULT_HEIGHT);

  const fetchTextures = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/textures?project_id=${projectId}`);
      if (res.ok) {
        const data = (await res.json()) as TextureMeta[];
        setTextures(data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTextures();
  }, [fetchTextures]);

  // Lazily resolve presigned URL for a texture thumbnail.
  // getPresignedUrl() caches at module level so reopening the panel reuses
  // the same URL without hitting the network until the 55-minute TTL expires.
  const ensureUrl = useCallback(async (textureId: string) => {
    if (urlCache[textureId]) return;
    const url = await getPresignedUrl(textureId);
    if (url) setUrlCache((prev) => ({ ...prev, [textureId]: url }));
  }, [urlCache]);

  useEffect(() => {
    textures.forEach((t) => { void ensureUrl(t.id); });
  }, [textures, ensureUrl]);

  const handleDelete = async (textureId: string) => {
    try {
      const res = await fetch(`/api/textures/${textureId}`, { method: 'DELETE' });
      if (res.ok) {
        setTextures((prev) => prev.filter((t) => t.id !== textureId));
        setUrlCache((prev) => {
          const next = { ...prev };
          delete next[textureId];
          return next;
        });
        if (detailTexture?.id === textureId) setDetailTexture(null);
        // Evict from the module-level presigned URL cache and IndexedDB.
        evictPresignedUrl(textureId);
        void evictCachedTexture(textureId);
      }
    } catch {
      // ignore
    }
  };

  const handleRename = async (textureId: string, newName: string) => {
    try {
      const res = await fetch(`/api/textures/${textureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const updated = (await res.json()) as TextureMeta;
        setTextures((prev) => prev.map((t) => (t.id === textureId ? updated : t)));
        if (detailTexture?.id === textureId) setDetailTexture(updated);
      }
    } catch {
      // ignore
    }
  };

  const handleTextureClick = (textureId: string) => {
    if (selectedObjectId !== undefined && onApplyTexture) {
      onApplyTexture(selectedObjectId, textureId);
    }
  };

  // ── Resize drag ──
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = height;

    const onMove = (ev: MouseEvent) => {
      if (dragStartY.current == null) return;
      const delta = dragStartY.current - ev.clientY;
      setHeight(Math.max(MIN_HEIGHT, dragStartH.current + delta));
    };
    const onUp = () => {
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      <div
        className="flex flex-col border-t border-vertra-border/40 bg-vertra-surface shrink-0 overflow-hidden"
        style={{ height }}
      >
        {/* Resize handle */}
        <div
          className="h-1 cursor-ns-resize shrink-0 hover:bg-vertra-cyan/30 transition-colors"
          onMouseDown={onResizeMouseDown}
        />

        <PanelHeader
          title="Textures"
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="icon"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                title="Upload textures"
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
              {onClose && (
                <Button variant="icon" size="sm" onClick={onClose} title="Close panel">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : textures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
              <ImageIcon className="w-6 h-6 text-vertra-text-dim/40" />
              <p className="text-xs text-vertra-text-dim/60 text-center">
                No textures yet.{' '}
                <button
                  className="text-vertra-cyan hover:underline cursor-pointer"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload some!
                </button>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {textures.map((texture) => (
                  <TextureCard
                    key={texture.id}
                    texture={texture}
                    thumbnailUrl={urlCache[texture.id]}
                    isSelectable={selectedObjectId !== undefined}
                    onApply={() => handleTextureClick(texture.id)}
                    onDelete={() => void handleDelete(texture.id)}
                    onRename={(name) => void handleRename(texture.id, name)}
                    onShowDetail={() => setDetailTexture(texture)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('texture-id', texture.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <TextureUploadModal
            projectId={projectId}
            onClose={() => setShowUploadModal(false)}
            onComplete={() => {
              setShowUploadModal(false);
              void fetchTextures();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailTexture && (
          <TextureDetailModal
            texture={detailTexture}
            thumbnailUrl={urlCache[detailTexture.id]}
            onClose={() => setDetailTexture(null)}
            onRename={(name) => void handleRename(detailTexture.id, name)}
            onDelete={() => void handleDelete(detailTexture.id)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Texture card ──────────────────────────────────────────────────────────────

interface TextureCardProps {
  texture: TextureMeta;
  thumbnailUrl?: string;
  isSelectable: boolean;
  onApply: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onShowDetail: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

function TextureCard({
  texture,
  thumbnailUrl,
  isSelectable,
  onApply,
  onDelete,
  onRename,
  onShowDetail,
  onDragStart,
}: TextureCardProps) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(texture.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when texture.name changes externally
  useEffect(() => {
    if (!isEditing) setEditValue(texture.name);
  }, [texture.name, isEditing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(texture.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== texture.name) onRename(trimmed);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(texture.name);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className="relative aspect-square"
    >
      <div
        draggable={!isEditing}
        onDragStart={onDragStart}
        onClick={isEditing ? undefined : onApply}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={isEditing ? undefined : `${texture.name}${texture.width && texture.height ? ` (${texture.width}×${texture.height})` : ''}`}
        className={`w-full h-full rounded-lg overflow-hidden border border-vertra-border/40 bg-vertra-surface-alt/40 cursor-pointer group
          ${isSelectable ? 'hover:border-vertra-cyan/60' : 'hover:border-vertra-border/70'}
        `}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={texture.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-vertra-text-dim/40" />
          </div>
        )}

        {/* Name overlay at bottom */}
        {isEditing ? (
          <div
            className="absolute bottom-0 inset-x-0 bg-black/80 px-1.5 py-1 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              className="flex-1 min-w-0 bg-transparent text-xs text-white outline-none border-b border-vertra-cyan/60"
              autoFocus
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}
              className="text-vertra-cyan hover:text-vertra-cyan/80 cursor-pointer shrink-0"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <p className="text-xs text-white truncate leading-tight flex-1">{texture.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(e); }}
              className="shrink-0 text-white/60 hover:text-white cursor-pointer transition-colors"
              title="Rename"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Top-right action buttons */}
        <AnimatePresence>
          {hovered && !isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute top-1 right-1 flex gap-0.5"
            >
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="p-1 rounded bg-black/60 hover:bg-vertra-surface/80 text-white transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onShowDetail(); }}
                title="View details"
              >
                <Info className="w-3 h-3" />
              </motion.button>
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="p-1 rounded bg-black/60 hover:bg-vertra-error/80 text-white transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete texture"
              >
                <Trash2 className="w-3 h-3" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Texture detail modal ───────────────────────────────────────────────────────

interface TextureDetailModalProps {
  texture: TextureMeta;
  thumbnailUrl?: string;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function TextureDetailModal({
  texture,
  thumbnailUrl,
  onClose,
  onRename,
  onDelete,
}: TextureDetailModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(texture.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(texture.name);
  }, [texture.name]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== texture.name) onRename(trimmed);
    setEditingName(false);
  };

  const rows: Array<{ label: string; value: string }> = [
    { label: 'ID', value: texture.id },
    { label: 'File', value: texture.file_name },
    { label: 'Type', value: texture.mime_type },
    { label: 'Size', value: formatBytes(texture.size_bytes) },
    ...(texture.width && texture.height
      ? [{ label: 'Dimensions', value: `${texture.width} × ${texture.height} px` }]
      : []),
    { label: 'Scope', value: texture.is_public ? 'Public' : texture.project_id ? 'Private — Project' : 'Private — Global' },
    { label: 'Created', value: new Date(texture.created_at).toLocaleString() },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 w-full max-w-sm bg-vertra-surface border border-vertra-border/60 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vertra-border/40 shrink-0">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1 mr-2">
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameValue(texture.name); setEditingName(false); }
                }}
                autoFocus
                className="flex-1 bg-transparent text-sm font-semibold text-vertra-text outline-none border-b border-vertra-cyan/60"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); commitName(); }}
                className="text-vertra-cyan hover:text-vertra-cyan/80 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 group cursor-pointer"
              onClick={() => { setEditingName(true); setTimeout(() => inputRef.current?.select(), 0); }}
              title="Click to rename"
            >
              <h2 className="text-sm font-semibold text-vertra-text truncate max-w-48">{texture.name}</h2>
              <Pencil className="w-3 h-3 text-vertra-text-dim/50 group-hover:text-vertra-cyan/70 transition-colors" />
            </button>
          )}
          <Button variant="icon" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="bg-vertra-surface-alt/30 h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt={texture.name} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Metadata rows */}
        <div className="px-4 py-3 space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-xs text-vertra-text-dim shrink-0">{label}</span>
              <span className="text-xs text-vertra-text text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-vertra-border/40">
          <Button
            variant="danger"
            size="sm"
            onClick={() => { onDelete(); onClose(); }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

