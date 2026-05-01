import type { ScriptTabs } from '@/components/studio/inspector/ScriptModal';

/** A single named script file stored in the Virtual File System. */
export interface ScriptFile {
  tabs: ScriptTabs;
}

/**
 * Virtual File System for a project's scripts.
 *
 * Keys are slash-separated paths (e.g. "player/controller.js").
 * The entire VFS is serialised to a single JSON blob and stored at
 * `scripts/{project_id}.json` in R2.
 */
export interface ScriptVfs {
  files: Record<string, ScriptFile>;
}

export const EMPTY_VFS: ScriptVfs = { files: {} };
