'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, FileCode2, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

function buildTree(scriptPaths: string[]): TreeNode[] {
  const root: FolderNode = { type: 'folder', name: '', path: '', children: [] };

  for (const filePath of [...scriptPaths].sort()) {
    const parts = filePath.split('/');
    let current = root;

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const path = parts.slice(0, index + 1).join('/');

      if (index === parts.length - 1) {
        current.children.push({ type: 'file', name: part, path });
        continue;
      }

      let folder = current.children.find(
        (node): node is FolderNode => node.type === 'folder' && node.name === part,
      );
      if (!folder) {
        folder = { type: 'folder', name: part, path, children: [] };
        current.children.push(folder);
      }
      current = folder;
    }
  }

  return root.children;
}

function TreeRow({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.type === 'file' && node.path === selectedPath;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (node.type === 'folder') {
            setExpanded((value) => !value);
            return;
          }
          onSelect(node.path);
        }}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
          isSelected
            ? 'bg-vertra-cyan/12 text-vertra-cyan ring-1 ring-vertra-cyan/30'
            : 'text-vertra-text hover:bg-vertra-surface-alt/60'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {node.type === 'folder' ? (
          <>
            <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            {expanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-vertra-cyan/75" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-vertra-cyan/75" />
            )}
          </>
        ) : (
          <>
            <span className="h-3 w-3 shrink-0" />
            <FileCode2 className="h-3.5 w-3.5 shrink-0 text-vertra-text-dim/70" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {node.type === 'folder' && expanded && node.children.map((child) => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

interface ScriptBindingPickerModalProps {
  scriptPaths: string[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ScriptBindingPickerModal({
  scriptPaths,
  selectedPath,
  onSelect,
  onClose,
  onConfirm,
}: ScriptBindingPickerModalProps) {
  const tree = buildTree(scriptPaths);

  const modal = (
    <div className="fixed inset-0 z-210 flex items-center justify-center p-4">
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close script picker"
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.14 }}
        className="relative z-10 flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-vertra-border/60 bg-vertra-surface/95 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Choose script"
      >
        <div className="border-b border-vertra-border/40 px-4 py-3">
          <p className="text-sm font-semibold text-vertra-text">Choose Script</p>
          <p className="mt-1 text-xs text-vertra-text-dim">
            Select a `.ts` file to bind and attach to the current object.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {tree.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-xs text-vertra-text-dim">
              No script files yet.
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeRow
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-vertra-border/40 px-4 py-3">
          <div className="mb-3 rounded-lg border border-vertra-border/40 bg-vertra-surface-alt/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-vertra-text-dim">Selected Script</p>
            <p className="mt-1 truncate font-mono text-xs text-vertra-text">
              {selectedPath ?? 'None'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" onClick={onConfirm} disabled={!selectedPath}>
              Attach Selected Script
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document === 'undefined'
    ? null
    : createPortal(<AnimatePresence>{modal}</AnimatePresence>, document.body);
}