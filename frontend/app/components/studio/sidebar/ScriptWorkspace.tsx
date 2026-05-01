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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
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

function TreeNodeRow({
  node,
  depth,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  onOpen: (path: string) => void;
}) {
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group flex items-center gap-1 px-2 py-0.5 rounded hover:bg-vertra-surface cursor-pointer select-none"
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
            <button
              title="Rename"
              className="p-0.5 rounded hover:bg-vertra-surface-alt text-vertra-text-dim hover:text-vertra-text"
              onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              title="Delete"
              className="p-0.5 rounded hover:bg-vertra-surface-alt text-vertra-text-dim hover:text-vertra-error"
              onClick={(e) => { e.stopPropagation(); deleteEntry(node.path); }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        )}
      </motion.div>

      {/* Recursive children */}
      {node.type === 'folder' && expanded && (
        <AnimatePresence>
          {node.children.map((child) => (
            <TreeNodeRow key={child.path} node={child} depth={depth + 1} onOpen={onOpen} />
          ))}
        </AnimatePresence>
      )}
    </>
  );
}

// ─── New entry prompt ─────────────────────────────────────────────────────────

function NewEntryPrompt({
  type,
  onCommit,
  onCancel,
}: {
  type: 'file' | 'folder';
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(type === 'file' ? 'untitled.js' : 'folder');
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
      <button onClick={onCancel} className="text-vertra-text-dim hover:text-vertra-text">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScriptWorkspace() {
  const { vfs, createFile, openScript } = useScriptStore();
  const { toggleSidebar } = useUIStore();
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);

  const tree = buildTree(vfs);
  const hasEntries = Object.keys(vfs.files).length > 0;

  /** Resolve a collision-free root-level path. */
  const uniqueRootPath = (base: string): string => {
    if (!vfs.files[base] && !Object.keys(vfs.files).some((k) => k === base)) return base;
    let n = 1;
    while (vfs.files[`${base} ${n}`] || Object.keys(vfs.files).some((k) => k === `${base} ${n}`)) n++;
    return `${base} ${n}`;
  };

  const handleCommitNew = (name: string) => {
    if (creating === 'file') {
      const path = uniqueRootPath(name);
      createFile(path);
      openScript(path);
    }
    // Folders are implicit (prefix of file paths) — just create a placeholder file inside.
    if (creating === 'folder') {
      const folder = uniqueRootPath(name);
      const filePath = `${folder}/untitled.js`;
      createFile(filePath);
      openScript(filePath);
    }
    setCreating(null);
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
          />
        ))}
      </div>
    </div>
  );
}
