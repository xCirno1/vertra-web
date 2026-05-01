import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_SCRIPT_TABS } from '@/components/studio/inspector/ScriptModal';
import type { ScriptTabs } from '@/components/studio/inspector/ScriptModal';
import type { ScriptVfs, ScriptFile } from '@/types/script';
import { EMPTY_VFS } from '@/types/script';

interface ScriptState {
  /** In-memory VFS for the active project. */
  vfs: ScriptVfs;
  /** Path of the script currently open in the editor (null = editor closed). */
  openScriptPath: string | null;

  // ── VFS hydration ──────────────────────────────────────────────────────────
  setVfs: (vfs: ScriptVfs) => void;
  resetVfs: () => void;

  // ── File / folder CRUD ────────────────────────────────────────────────────
  createFile: (path: string, tabs?: ScriptTabs) => void;
  updateFile: (path: string, file: ScriptFile) => void;
  renameEntry: (oldPath: string, newPath: string) => void;
  deleteEntry: (path: string) => void;
  bindScriptToObject: (objectId: number, path: string) => void;
  unbindScriptFromObject: (objectId: number) => void;

  // ── Editor state ──────────────────────────────────────────────────────────
  openScript: (path: string) => void;
  closeScript: () => void;
}

export const useScriptStore = create<ScriptState>()(
  immer((set) => ({
    vfs: EMPTY_VFS,
    openScriptPath: null,

    setVfs: (vfs) => set((s) => {
      s.vfs = {
        files: vfs.files ?? {},
        bindings: vfs.bindings ?? {},
      };
    }),
    resetVfs: () => set((s) => { s.vfs = EMPTY_VFS; s.openScriptPath = null; }),

    createFile: (path, tabs = DEFAULT_SCRIPT_TABS) =>
      set((s) => {
        if (!s.vfs.files[path]) {
          s.vfs.files[path] = { tabs: { ...tabs } };
        }
      }),

    updateFile: (path, file) =>
      set((s) => {
        s.vfs.files[path] = file;
      }),

    renameEntry: (oldPath, newPath) =>
      set((s) => {
        // Rename single file or all files under a folder prefix.
        const updatedFiles: ScriptVfs['files'] = {};
        for (const [k, v] of Object.entries(s.vfs.files)) {
          if (k === oldPath) {
            updatedFiles[newPath] = v;
          } else if (k.startsWith(oldPath + '/')) {
            updatedFiles[newPath + k.slice(oldPath.length)] = v;
          } else {
            updatedFiles[k] = v;
          }
        }
        s.vfs.files = updatedFiles;

        for (const [objectId, boundPath] of Object.entries(s.vfs.bindings)) {
          if (boundPath === oldPath) {
            s.vfs.bindings[objectId] = newPath;
          } else if (boundPath.startsWith(oldPath + '/')) {
            s.vfs.bindings[objectId] = newPath + boundPath.slice(oldPath.length);
          }
        }

        if (s.openScriptPath === oldPath) s.openScriptPath = newPath;
      }),

    deleteEntry: (path) =>
      set((s) => {
        for (const k of Object.keys(s.vfs.files)) {
          if (k === path || k.startsWith(path + '/')) {
            delete s.vfs.files[k];
          }
        }

        for (const [objectId, boundPath] of Object.entries(s.vfs.bindings)) {
          if (boundPath === path || boundPath.startsWith(path + '/')) {
            delete s.vfs.bindings[objectId];
          }
        }

        if (s.openScriptPath === path || s.openScriptPath?.startsWith(path + '/')) {
          s.openScriptPath = null;
        }
      }),

    bindScriptToObject: (objectId, path) => set((s) => {
      s.vfs.bindings[String(objectId)] = path;
    }),

    unbindScriptFromObject: (objectId) => set((s) => {
      delete s.vfs.bindings[String(objectId)];
    }),

    openScript: (path) => set((s) => { s.openScriptPath = path; }),
    closeScript: () => set((s) => { s.openScriptPath = null; }),
  })),
);
