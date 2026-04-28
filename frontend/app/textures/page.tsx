'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Globe,
  ImageIcon,
  Info,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence as AP } from 'framer-motion';
import { getPresignedUrl, evictPresignedUrl, evictCachedTexture } from '@/lib/storage/texture-cache';
import TextureUploadModal from '@/components/studio/textures/TextureUploadModal';
import type { TextureMeta } from '@/types/texture';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function scopeLabel(t: TextureMeta): string {
  if (t.is_public) return 'Public';
  if (t.project_id) return 'Private — Project';
  return 'Private — Global';
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TexturesPage() {
  const [textures, setTextures] = useState<TextureMeta[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'public' | 'private'>('all');
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [detailTexture, setDetailTexture] = useState<TextureMeta | null>(null);

  // Fetch current user id so we can determine ownership
  useEffect(() => {
    void fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { id?: string } } | null) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
      })
      .catch(() => null);
  }, []);

  const fetchTextures = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/textures?include_public=true');
      if (res.status === 401) {
        setError('Sign in to view your texture library.');
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as TextureMeta[];
      setTextures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load textures.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTextures(); }, [fetchTextures]);

  // Resolve presigned URLs from module-level cache
  useEffect(() => {
    textures.forEach((t) => {
      if (urlCache[t.id]) return;
      void getPresignedUrl(t.id).then((url) => {
        if (url) setUrlCache((prev) => ({ ...prev, [t.id]: url }));
      });
    });
  }, [textures, urlCache]);

  const handleDelete = async (textureId: string) => {
    const res = await fetch(`/api/textures/${textureId}`, { method: 'DELETE' });
    if (res.ok) {
      setTextures((prev) => prev.filter((t) => t.id !== textureId));
      setUrlCache((prev) => { const n = { ...prev }; delete n[textureId]; return n; });
      if (detailTexture?.id === textureId) setDetailTexture(null);
      evictPresignedUrl(textureId);
      void evictCachedTexture(textureId);
    }
  };

  const handleRename = async (textureId: string, newName: string) => {
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
  };

  const handleTogglePublic = async (textureId: string, isPublic: boolean) => {
    const res = await fetch(`/api/textures/${textureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: isPublic }),
    });
    if (res.ok) {
      const updated = (await res.json()) as TextureMeta;
      setTextures((prev) => prev.map((t) => (t.id === textureId ? updated : t)));
      if (detailTexture?.id === textureId) setDetailTexture(updated);
    }
  };

  const filtered = textures.filter((t) => {
    const matchesQuery =
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.mime_type.includes(query.toLowerCase());
    const matchesScope =
      scopeFilter === 'all' ||
      (scopeFilter === 'public' && t.is_public) ||
      (scopeFilter === 'private' && !t.is_public);
    return matchesQuery && matchesScope;
  });

  // Group for display: own textures first, then community
  const ownTextures = filtered.filter((t) => t.owner_id === currentUserId);
  const communityTextures = filtered.filter((t) => t.owner_id !== currentUserId && t.is_public);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-vertra-cyan" />
            <h1 className="text-2xl font-semibold text-vertra-text">Texture Library</h1>
          </div>
          <p className="text-sm text-vertra-text-dim">
            Manage your textures and browse the community library.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-vertra-cyan/30 bg-vertra-cyan/10 px-4 py-2 text-sm text-vertra-cyan hover:bg-vertra-cyan/20 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload Texture
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vertra-text-dim pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-vertra-border/50 bg-vertra-surface pl-9 pr-9 py-2 text-sm text-vertra-text placeholder:text-vertra-text-dim/60 focus:border-vertra-cyan/60 focus:outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-vertra-text-dim hover:text-vertra-text cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scope tabs */}
        <div className="flex rounded-lg border border-vertra-border/40 bg-vertra-surface overflow-hidden shrink-0">
          {([
            { key: 'all', label: 'All' },
            { key: 'public', label: 'Public', icon: <Users className="w-3 h-3" /> },
            { key: 'private', label: 'Private', icon: <Lock className="w-3 h-3" /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setScopeFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors cursor-pointer ${scopeFilter === key
                ? 'bg-vertra-cyan/15 text-vertra-cyan'
                : 'text-vertra-text-dim hover:text-vertra-text hover:bg-vertra-surface-alt/40'
                }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {error ? (
        <ErrorState message={error} />
      ) : isLoading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={!!query} onUpload={() => setShowUploadModal(true)} />
      ) : (
        <div className="space-y-8">
          {/* Own textures */}
          {ownTextures.length > 0 && (
            <section>
              {communityTextures.length > 0 && (
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-vertra-text-dim">
                  Your Textures ({ownTextures.length})
                </h2>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <AnimatePresence>
                  {ownTextures.map((t, i) => (
                    <TextureCard
                      key={t.id}
                      texture={t}
                      thumbnailUrl={urlCache[t.id]}
                      index={i}
                      isOwner
                      onShowDetail={() => setDetailTexture(t)}
                      onDelete={() => void handleDelete(t.id)}
                      onRename={(name) => void handleRename(t.id, name)}
                      onTogglePublic={(v) => void handleTogglePublic(t.id, v)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}

          {/* Community public textures */}
          {communityTextures.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-vertra-text-dim">
                Community ({communityTextures.length})
              </h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <AnimatePresence>
                  {communityTextures.map((t, i) => (
                    <TextureCard
                      key={t.id}
                      texture={t}
                      thumbnailUrl={urlCache[t.id]}
                      index={i}
                      isOwner={false}
                      onShowDetail={() => setDetailTexture(t)}
                      onDelete={() => void handleDelete(t.id)}
                      onRename={(name) => void handleRename(t.id, name)}
                      onTogglePublic={(v) => void handleTogglePublic(t.id, v)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}
        </div>
      )}

      {/* Upload modal */}
      <AnimatePresence>
        {showUploadModal && (
          <TextureUploadModal
            onClose={() => setShowUploadModal(false)}
            onComplete={() => {
              setShowUploadModal(false);
              void fetchTextures();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailTexture && (
          <TextureDetailModal
            texture={detailTexture}
            thumbnailUrl={urlCache[detailTexture.id]}
            isOwner={detailTexture.owner_id === currentUserId}
            onClose={() => setDetailTexture(null)}
            onRename={(name) => void handleRename(detailTexture.id, name)}
            onDelete={() => void handleDelete(detailTexture.id)}
            onTogglePublic={(v) => void handleTogglePublic(detailTexture.id, v)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TextureCard ──────────────────────────────────────────────────────────────

interface TextureCardProps {
  texture: TextureMeta;
  thumbnailUrl?: string;
  index: number;
  isOwner: boolean;
  onShowDetail: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onTogglePublic: (isPublic: boolean) => void;
}

function TextureCard({
  texture,
  thumbnailUrl,
  index,
  isOwner,
  onShowDetail,
  onDelete,
  onRename,
  onTogglePublic,
}: TextureCardProps) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(texture.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(texture.name);
  }, [texture.name, isEditing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    setEditValue(texture.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== texture.name) onRename(trimmed);
    setIsEditing(false);
  };

  const VisibilityIcon = texture.is_public ? Users : texture.project_id ? Lock : Globe;
  const visibilityColor = texture.is_public ? 'text-vertra-teal' : 'text-vertra-text-dim';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
      className="group relative rounded-xl overflow-hidden border border-vertra-border/40 bg-vertra-surface-alt/30 hover:border-vertra-cyan/40 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-vertra-surface-alt/50 flex items-center justify-center">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt={texture.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="w-8 h-8 text-vertra-text-dim/30" />
        )}
      </div>

      {/* Scope badge */}
      <div className="absolute top-2 left-2">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-black/60 ${visibilityColor}`}>
          <VisibilityIcon className="w-2.5 h-2.5" />
          {texture.is_public ? 'Public' : texture.project_id ? 'Project' : 'Global'}
        </span>
      </div>

      {/* Top-right actions (owner only) */}
      <AnimatePresence>
        {hovered && isOwner && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute top-2 right-2 flex gap-0.5"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onShowDetail(); }}
              className="p-1 rounded bg-black/60 hover:bg-vertra-surface/80 text-white transition-colors cursor-pointer"
              title="View details"
            >
              <Info className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePublic(!texture.is_public); }}
              className={`p-1 rounded bg-black/60 text-white transition-colors cursor-pointer ${texture.is_public ? 'hover:bg-amber-500/60' : 'hover:bg-vertra-teal/60'
                }`}
              title={texture.is_public ? 'Make private' : 'Make public'}
            >
              {texture.is_public ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded bg-black/60 hover:bg-red-500/60 text-white transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
        {/* Non-owner: just info button */}
        {hovered && !isOwner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute top-2 right-2"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onShowDetail(); }}
              className="p-1 rounded bg-black/60 hover:bg-vertra-surface/80 text-white transition-colors cursor-pointer"
              title="View details"
            >
              <Info className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name overlay */}
      {isEditing ? (
        <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1.5 py-1 flex items-center gap-1">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') { setEditValue(texture.name); setIsEditing(false); }
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
          {isOwner && (
            <button
              onClick={startEdit}
              className="shrink-0 text-white/60 hover:text-white cursor-pointer transition-colors"
              title="Rename"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── TextureDetailModal ───────────────────────────────────────────────────────

interface TextureDetailModalProps {
  texture: TextureMeta;
  thumbnailUrl?: string;
  isOwner: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onTogglePublic: (isPublic: boolean) => void;
}

function TextureDetailModal({
  texture,
  thumbnailUrl,
  isOwner,
  onClose,
  onRename,
  onDelete,
  onTogglePublic,
}: TextureDetailModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(texture.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameValue(texture.name); }, [texture.name]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== texture.name) onRename(trimmed);
    setEditingName(false);
  };

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'ID', value: <span className="font-mono text-[10px]">{texture.id}</span> },
    { label: 'File', value: texture.file_name },
    { label: 'Type', value: texture.mime_type },
    { label: 'Size', value: formatBytes(texture.size_bytes) },
    ...(texture.width && texture.height
      ? [{ label: 'Dimensions', value: `${texture.width} × ${texture.height} px` }]
      : []),
    { label: 'Scope', value: scopeLabel(texture) },
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
          {editingName && isOwner ? (
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
              className={`flex items-center gap-1.5 group ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => {
                if (!isOwner) return;
                setEditingName(true);
                setTimeout(() => inputRef.current?.select(), 0);
              }}
              title={isOwner ? 'Click to rename' : undefined}
            >
              <h2 className="text-sm font-semibold text-vertra-text truncate max-w-48">{texture.name}</h2>
              {isOwner && (
                <Pencil className="w-3 h-3 text-vertra-text-dim/50 group-hover:text-vertra-cyan/70 transition-colors" />
              )}
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-vertra-surface-alt/60 text-vertra-text-dim hover:text-vertra-text transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="bg-vertra-surface-alt/30 h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt={texture.name} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Metadata */}
        <div className="px-4 py-3 space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-xs text-vertra-text-dim shrink-0">{label}</span>
              <span className="text-xs text-vertra-text text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        {isOwner && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-vertra-border/40">
            <button
              onClick={() => onTogglePublic(!texture.is_public)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors cursor-pointer ${texture.is_public
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'border-vertra-teal/40 bg-vertra-teal/10 text-vertra-teal hover:bg-vertra-teal/20'
                }`}
            >
              {texture.is_public ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {texture.is_public ? 'Make Private' : 'Make Public'}
            </button>
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl bg-vertra-surface-alt/50 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ hasQuery, onUpload }: { hasQuery: boolean; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ImageIcon className="w-10 h-10 text-vertra-text-dim/30" />
      <p className="text-sm text-vertra-text-dim">
        {hasQuery ? 'No textures match your search.' : 'No textures yet.'}
      </p>
      {!hasQuery && (
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 text-xs text-vertra-cyan hover:underline cursor-pointer"
        >
          <Upload className="w-3 h-3" />
          Upload your first texture
        </button>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertCircle className="w-8 h-8 text-vertra-error/60" />
      <p className="text-sm text-vertra-text-dim">{message}</p>
      {message.includes('Sign in') && (
        <a
          href="/login"
          className="rounded-lg border border-vertra-cyan/30 bg-vertra-cyan/10 px-4 py-2 text-sm text-vertra-cyan hover:bg-vertra-cyan/20 transition-colors cursor-pointer"
        >
          Sign in
        </a>
      )}
    </div>
  );
}


