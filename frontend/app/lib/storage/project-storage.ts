import { Project } from '@/types/scene';
import { createEmptyScene } from '@/lib/scene/scene-factory';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCAL_PROJECTS_KEY = 'vertra.projects.v1';
const LOCAL_OWNER_ID = 'guest-local';

/**
 * Base path for all project API calls. All requests go through Next.js proxy
 * routes which read the httpOnly JWT cookie and forward it to the Rust backend.
 */
const API_BASE = '/api';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ProjectSource = 'local' | 'cloud';

export interface ProjectSettings {
  autosaveEnabled: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  autosaveEnabled: true,
};

export interface EngineProject extends Project {
  description?: string;
  settings?: ProjectSettings;
}

export interface LoadProjectsResult {
  projects: EngineProject[];
  source: ProjectSource;
  canSyncToCloud: boolean;
  isAuthenticated: boolean;
}

// ─── Stored shape (no scene — engine owns that via VTR) ──────────────────────

interface StoredProject {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  script?: string;
  thumbnail?: string;
  settings?: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Reads the non-httpOnly companion cookie (`vertra-authed=1`) that the
 * Next.js login/register routes set alongside the httpOnly JWT cookie.
 * The actual JWT is never accessible from JS — it lives in `vertra-token`
 * (httpOnly, Secure, SameSite=Strict) and is forwarded to the Rust backend
 * by the Next.js proxy routes.
 */
function isAuthenticated(): boolean {
  if (!isBrowser()) return false;
  return document.cookie.split(';').some((c) => c.trim() === 'vertra-authed=1');
}

/** Returns true when an active session cookie is present. */
export async function hasCloudSession(): Promise<boolean> {
  return isAuthenticated();
}

// ─── Generic API fetch helper ────────────────────────────────────────────────

/**
 * Fetches from the Next.js API proxy routes (`/api/...`). The httpOnly JWT
 * cookie is forwarded automatically by the browser (same-origin request).
 * No Authorization header is needed here.
 */
async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** Shape returned by the Rust backend for a project. */
interface ApiProject {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  script?: string | null;
  created_at: string;
  updated_at: string;
}

function apiProjectToEngine(p: ApiProject): EngineProject {
  return {
    id: p.id,
    name: p.name,
    ownerId: p.owner_id,
    description: p.description ?? undefined,
    script: p.script ?? undefined,
    thumbnail: p.thumbnail ?? undefined,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
    // Scene state is owned by the engine (VTR). Start fresh; the engine will
    // populate it once a VTR snapshot is loaded or the user adds entities.
    scene: createEmptyScene(),
  };
}

function storedToEngine(p: StoredProject): EngineProject {
  return {
    id: p.id,
    name: p.name,
    ownerId: p.ownerId,
    description: p.description,
    script: p.script,
    thumbnail: p.thumbnail,
    settings: p.settings,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
    scene: createEmptyScene(),
  };
}

function engineToStored(p: EngineProject): StoredProject {
  return {
    id: p.id,
    name: p.name,
    ownerId: p.ownerId,
    description: p.description,
    script: p.script,
    thumbnail: p.thumbnail,
    settings: p.settings,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Local storage helpers ───────────────────────────────────────────────────

function readLocalProjects(): StoredProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProject[];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: StoredProject[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new unsaved project draft (not yet persisted).
 */
export function createProjectDraft(name: string): EngineProject {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name,
    ownerId: LOCAL_OWNER_ID,
    scene: createEmptyScene(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Load all projects. Uses cloud storage when a JWT is present,
 * otherwise falls back to localStorage.
 */
export async function loadProjects(): Promise<LoadProjectsResult> {
  if (isAuthenticated()) {
    try {
      const apiProjects = await apiFetch<ApiProject[]>('/projects');
      return {
        projects: apiProjects.map(apiProjectToEngine),
        source: 'cloud',
        canSyncToCloud: false,
        isAuthenticated: true,
      };
    } catch {
      // Cloud unreachable — fall through to local storage
    }
  }

  const local = readLocalProjects().map(storedToEngine);
  const canSyncToCloud = isAuthenticated() && local.length > 0;

  return {
    projects: local,
    source: 'local',
    canSyncToCloud,
    isAuthenticated: isAuthenticated(),
  };
}

/**
 * Persist a project. Saves to the cloud when authenticated,
 * otherwise to localStorage. Returns the destination.
 */
export async function saveProject(
  project: EngineProject,
): Promise<ProjectSource> {
  if (isAuthenticated()) {
    // When logged in, always save to cloud. Do NOT fall back to localStorage —
    // that would silently diverge the local and cloud state.
    // Try PATCH first (update); if 404, use POST (create).
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: project.name,
          description: project.description ?? null,
          script: project.script ?? null,
          thumbnail: project.thumbnail ?? null,
          scene: null,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('404')) throw err;

      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          description: project.description ?? null,
          script: project.script ?? null,
          thumbnail: project.thumbnail ?? null,
          scene: null,
        }),
      });
    }
    return 'cloud';
  }

  const stored = readLocalProjects();
  const idx = stored.findIndex((p) => p.id === project.id);
  const entry = engineToStored({ ...project, updatedAt: new Date() });

  if (idx >= 0) {
    stored[idx] = entry;
  } else {
    stored.push(entry);
  }

  writeLocalProjects(stored);
  return 'local';
}

/**
 * Upload all locally-stored projects to the cloud via the sync endpoint.
 * Returns the number of projects successfully synced.
 */
export async function syncLocalProjectsToCloud(): Promise<number> {
  if (!isAuthenticated()) return 0;

  const local = readLocalProjects();
  if (local.length === 0) return 0;

  try {
    const body = {
      projects: local.map((p) => ({
        name: p.name,
        description: p.description ?? null,
        script: p.script ?? null,
        thumbnail: p.thumbnail ?? null,
        scene: null,
      })),
    };

    const result = await apiFetch<{ synced: number }>('/projects/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result.synced;
  } catch {
    return 0;
  }
}
