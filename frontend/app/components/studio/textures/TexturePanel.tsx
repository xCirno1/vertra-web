'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageIcon, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelHeader } from '@/components/ui/panel-header';
import { Skeleton } from '@/components/ui/skeleton';
import TextureUploadModal from './TextureUploadModal';
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

export default function TexturePanel({
  projectId,
  selectedObjectId,
  onApplyTexture,
  onClose,
}: TexturePanelProps) {
  const [textures, setTextures] = useState<TextureMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  // Cache presigned URLs: textureId → url
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

  // Lazily fetch presigned URL for a texture thumbnail
  const ensureUrl = useCallback(async (textureId: string) => {
    if (urlCache[textureId]) return;
    try {
      const res = await fetch(`/api/textures/${textureId}`);
      if (res.ok) {
        const data = (await res.json()) as { url: string };
        setUrlCache((prev) => ({ ...prev, [textureId]: data.url }));
      }
    } catch {
      // ignore
    }
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
                  className="text-vertra-cyan hover:underline"
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
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

function TextureCard({
  texture,
  thumbnailUrl,
  isSelectable,
  onApply,
  onDelete,
  onDragStart,
}: TextureCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className={`relative aspect-square rounded-lg overflow-hidden border border-vertra-border/40 bg-vertra-surface-alt/40 cursor-pointer group
        ${isSelectable ? 'hover:border-vertra-cyan/60' : 'hover:border-vertra-border/70'}
      `}
      draggable
      onDragStart={onDragStart}
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${texture.name}${texture.width && texture.height ? ` (${texture.width}×${texture.height})` : ''}`}
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
      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate leading-tight">{texture.name}</p>
      </div>

      {/* Delete button */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-vertra-error/80 text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete texture"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
