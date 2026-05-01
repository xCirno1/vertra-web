'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useScriptStore } from '@/stores/scriptStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { PanelHeader } from '@/components/ui/panel-header';
import { getDefaultScriptTabs } from '@/components/studio/inspector/ScriptModal';
import type { ScriptVfs } from '@/types/script';

// ─── Tree node types ──────────────────────────────────────────────────────────

interface FileNode {
  type: 'file';
  name: string;
  path: string;
}

interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

type TreeNode = FileNode | FolderNode;

// ─── Build tree from flat path map ───────────────────────────────────────────

function buildTree(vfs: ScriptVfs): TreeNode[] {
  const root: FolderNode = { type: 'folder', name: '', path: '', children: [] };

  for (const filePath of Object.keys(vfs.files).sort()) {
    const parts = filePath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      if (i === parts.length - 1) {
        current.children.push({ type: 'file', name: part, path });
      } else {
        let folder = current.children.find(
          (n): n is FolderNode => n.type === 'folder' && n.name === part,
        );
        if (!folder) {
          folder = { type: 'folder', name: part, path, children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  return root.children;
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function RenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value.trim()) onCommit(value.trim()); else onCancel(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) onCommit(value.trim());
        else if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 px-1 text-xs bg-vertra-surface border border-vertra-cyan/50 rounded text-vertra-text outline-none"
    />
  );
}

// ─── Tree node row ────────────────────────────────────────────────────────────

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  onOpen: (path: string) => void;
  onCreateInFolder?: (folderPath: string) => void;
  draggingPathRef: React.MutableRefObject<string | null>;
  dragOverFolder: string | null;
  onDragOverFolder: (path: string | null) => void;
  onDropInFolder: (folderPath: string) => void;
  creatingInFolder: string | null;
  onCancelCreateInFolder: () => void;
  onCommitCreateInFolder: (folderPath: string, name: string) => void;
}

function TreeNodeRow({
  node,
  depth,
  onOpen,
  onCreateInFolder,
  draggingPathRef,
  dragOverFolder,
  onDragOverFolder,
  onDropInFolder,
  creatingInFolder,
  onCancelCreateInFolder,
  onCommitCreateInFolder,
}: TreeNodeRowProps) {
  const { renameEntry, deleteEntry } = useScriptStore();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);

  const indent = depth * 12;

  const handleRename = (newName: string) => {
    const parentPrefix = node.path.includes('/')
      ? node.path.slice(0, node.path.lastIndexOf('/') + 1)
      : '';
    renameEntry(node.path, parentPrefix + newName);
    setRenaming(false);
  };

  const isDropTarget = node.type === 'folder' && dragOverFolder === node.path;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        draggable
        onDragStart={(e) => {
          draggingPathRef.current = node.path;
          (e as unknown as React.DragEvent).dataTransfer.effectAllowed = 'move';
          // Prevent the drag event from bubbling to a parent folder row
          e.stopPropagation();
        }}
        onDragEnd={() => {
          draggingPathRef.current = null;
          onDragOverFolder(null);
        }}
        onDragOver={node.type === 'folder' ? (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverFolder(node.path);
        } : undefined}
        onDragLeave={node.type === 'folder' ? (e) => {
          // Only clear if leaving the folder row itself, not a child
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            onDragOverFolder(null);
          }
        } : undefined}
        onDrop={node.type === 'folder' ? (e) => {
          e.preventDefault();
          onDragOverFolder(null);
          onDropInFolder(node.path);
        } : undefined}
        className={`group flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer select-none transition-colors ${isDropTarget ? 'bg-vertra-cyan/10 ring-1 ring-vertra-cyan/40' : 'hover:bg-vertra-surface'
          }`}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => {
          if (node.type === 'folder') setExpanded((e) => !e);
          else onOpen(node.path);
        }}
      >
        {/* Icon */}
        {node.type === 'folder' ? (
          <span className="flex items-center shrink-0 text-vertra-text-dim">
            <ChevronRight
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            {expanded ? (
              <FolderOpen className="w-3.5 h-3.5 ml-0.5 text-vertra-cyan/70" />
            ) : (
              <Folder className="w-3.5 h-3.5 ml-0.5 text-vertra-cyan/70" />
            )}
          </span>
        ) : (
          <File className="w-3.5 h-3.5 shrink-0 text-vertra-text-dim/60" />
        )}

        {/* Name or rename input */}
        {renaming ? (
          <RenameInput
            initialValue={node.name}
            onCommit={handleRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className="flex-1 text-xs text-vertra-text truncate">{node.name}</span>
        )}

        {/* Action buttons (visible on hover) */}
        {!renaming && (
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {node.type === 'folder' && onCreateInFolder && (
              <button
                title="New file in folder"
                className="p-0.5 rounded hover:bg-vertra-surface-alt text-vertra-text-dim hover:text-vertra-cyan cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onCreateInFolder(node.path); setExpanded(true); }}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button
              title="Rename"
              className="p-0.5 rounded hover:bg-vertra-surface-alt text-vertra-text-dim hover:text-vertra-text cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              title="Delete"
              className="p-0.5 rounded hover:bg-vertra-surface-alt text-vertra-text-dim hover:text-vertra-error cursor-pointer"
              onClick={(e) => { e.stopPropagation(); deleteEntry(node.path); }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        )}
      </motion.div>

      {/* Recursive children + inline create prompt */}
      {node.type === 'folder' && expanded && (
        <AnimatePresence>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              onOpen={onOpen}
              onCreateInFolder={onCreateInFolder}
              draggingPathRef={draggingPathRef}
              dragOverFolder={dragOverFolder}
              onDragOverFolder={onDragOverFolder}
              onDropInFolder={onDropInFolder}
              creatingInFolder={creatingInFolder}
              onCancelCreateInFolder={onCancelCreateInFolder}
              onCommitCreateInFolder={onCommitCreateInFolder}
            />
          ))}
          {/* Inline new-file prompt shown inside this folder */}
          {creatingInFolder === node.path && (
            <div
              className="flex items-center gap-1.5 py-0.5"
              style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
            >
              <File className="w-3.5 h-3.5 shrink-0 text-vertra-text-dim/60" />
              <RenameInput
                initialValue="untitled.ts"
                onCommit={(name) => onCommitCreateInFolder(node.path, name)}
                onCancel={onCancelCreateInFolder}
              />
            </div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

// ─── Unique path helper ──────────────────────────────────────────────────────
// Inserts "(N)" between the stem and extension until the path is free.
// Works for both files (stem.ext) and folders (no extension).
// Checks existence as a direct file key AND as a folder prefix in vfsFiles.

function makeUniquePath(
  destPath: string,
  vfsFiles: Record<string, unknown>,
): string {
  const isUsed = (p: string) =>
    p in vfsFiles || Object.keys(vfsFiles).some((k) => k.startsWith(p + '/'));

  if (!isUsed(destPath)) return destPath;

  const lastSlash = destPath.lastIndexOf('/');
  const dir = lastSlash >= 0 ? destPath.slice(0, lastSlash + 1) : '';
  const basename = lastSlash >= 0 ? destPath.slice(lastSlash + 1) : destPath;

  const dotIdx = basename.lastIndexOf('.');
  const stem = dotIdx > 0 ? basename.slice(0, dotIdx) : basename;
  const ext = dotIdx > 0 ? basename.slice(dotIdx) : '';

  let n = 1;
  while (isUsed(`${dir}${stem}(${n})${ext}`)) n++;
  return `${dir}${stem}(${n})${ext}`;
}

// ─── New entry prompt ─────────────────────────────────────────────────────────

function NewEntryPrompt({
  type,
  defaultName,
  onCommit,
  onCancel,
}: {
  type: 'file' | 'folder';
  defaultName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultName);
  return (
    <div className="flex items-center gap-1.5 px-3 py-1">
      {type === 'file' ? (
        <File className="w-3.5 h-3.5 shrink-0 text-vertra-text-dim/60" />
      ) : (
        <Folder className="w-3.5 h-3.5 shrink-0 text-vertra-cyan/70" />
      )}
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (value.trim()) onCommit(value.trim()); else onCancel(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onCommit(value.trim());
          else if (e.key === 'Escape') onCancel();
        }}
        className="flex-1 min-w-0 px-1 text-xs bg-vertra-surface border border-vertra-cyan/50 rounded text-vertra-text outline-none"
      />
      <button onClick={onCancel} className="text-vertra-text-dim hover:text-vertra-text cursor-pointer">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScriptWorkspace() {
  const { vfs, createFile, openScript, renameEntry } = useScriptStore();
  const { toggleSidebar } = useUIStore();
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null);
  const draggingPathRef = useRef<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const ext = '.ts';
  const tree = buildTree(vfs);
  const hasEntries = Object.keys(vfs.files).length > 0;

  const handleCommitNew = (name: string) => {
    if (creating === 'file') {
      const path = makeUniquePath(name, vfs.files);
      createFile(path, getDefaultScriptTabs());
      openScript(path);
    }
    if (creating === 'folder') {
      const folder = makeUniquePath(name, vfs.files);
      const filePath = makeUniquePath(`${folder}/untitled${ext}`, vfs.files);
      createFile(filePath, getDefaultScriptTabs());
      openScript(filePath);
    }
    setCreating(null);
  };

  const handleCreateInFolder = (folderPath: string) => {
    setCreatingInFolder(folderPath);
  };

  const handleCommitCreateInFolder = (folderPath: string, name: string) => {
    const filePath = makeUniquePath(`${folderPath}/${name}`, vfs.files);
    createFile(filePath, getDefaultScriptTabs());
    openScript(filePath);
    setCreatingInFolder(null);
  };

  const handleDropInFolder = (folderPath: string) => {
    const src = draggingPathRef.current;
    if (!src) return;
    // Prevent dropping a folder into itself or one of its own descendants
    if (folderPath === src || folderPath.startsWith(src + '/')) return;
    const name = src.includes('/') ? src.slice(src.lastIndexOf('/') + 1) : src;
    const dest = makeUniquePath(`${folderPath}/${name}`, vfs.files);
    if (src !== dest) renameEntry(src, dest);
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Scripts"
        actions={
          <>
            <Button
              variant="icon"
              size="sm"
              title="New script file"
              onClick={() => setCreating('file')}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="icon"
              size="sm"
              title="New folder"
              onClick={() => setCreating('folder')}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="icon" size="sm" onClick={toggleSidebar} title="Close panel">
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto py-1">
        {/* New entry input shown at the top */}
        {creating && (
          <NewEntryPrompt
            type={creating}
            defaultName={creating === 'file' ? `untitled${ext}` : 'folder'}
            onCommit={handleCommitNew}
            onCancel={() => setCreating(null)}
          />
        )}

        {!hasEntries && !creating && (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <File className="w-7 h-7 text-vertra-border mx-auto mb-2" />
            <p className="text-xs text-vertra-text-dim">No scripts yet</p>
            <p className="text-xs text-vertra-text-dim/60 mt-0.5">
              Click + to create a script file
            </p>
          </div>
        )}

        {tree.map((node) => (
          <TreeNodeRow
            key={node.path}
            node={node}
            depth={0}
            onOpen={(path) => openScript(path)}
            onCreateInFolder={handleCreateInFolder}
            draggingPathRef={draggingPathRef}
            dragOverFolder={dragOverFolder}
            onDragOverFolder={setDragOverFolder}
            onDropInFolder={handleDropInFolder}
            creatingInFolder={creatingInFolder}
            onCancelCreateInFolder={() => setCreatingInFolder(null)}
            onCommitCreateInFolder={handleCommitCreateInFolder}
          />
        ))}
      </div>
    </div>
  );
}

