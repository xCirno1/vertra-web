/**
 * Three-level texture cache for the Vertra engine.
 *
 * Level 1 – Engine memory   : checked via `scene.has_texture(id)` at call-site
 * Level 2 – IndexedDB cache : decoded RGBA pixels stored per textureId
 * Level 3 – CDN fetch       : https://cdn.yourapp.com/cache/{id}.ktx2
 *
 * Fallback: presigned R2 URL via /api/textures/{id}
 */

const DB_NAME = 'vertra-texture-cache';
const STORE_NAME = 'rgba';
const DB_VERSION = 1;

/** How long a cached entry is considered fresh (7 days). */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const CDN_BASE = 'https://cdn.yourapp.com/cache';

/** Build the CDN URL for a texture by its ID. */
export function cdnTextureUrl(id: string): string {
  return `${CDN_BASE}/${id}.ktx2`;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

export interface CachedTextureEntry {
  id: string;
  width: number;
  height: number;
  /** Raw RGBA pixel bytes — matches `Uint8Array` expected by the engine. */
  data: Uint8Array;
  cachedAt: number;
}

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve a cached RGBA entry.
 * Returns `null` when the entry is missing or older than `CACHE_TTL_MS`.
 */
export async function getCachedTexture(id: string): Promise<CachedTextureEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const entry = req.result as CachedTextureEntry | undefined;
        if (!entry) { resolve(null); return; }
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
          // Stale — evict lazily.
          void evictCachedTexture(id);
          resolve(null);
          return;
        }
        resolve(entry);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Persist decoded RGBA pixel data to IndexedDB. */
export async function setCachedTexture(
  id: string,
  width: number,
  height: number,
  data: Uint8Array,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const entry: CachedTextureEntry = { id, width, height, data, cachedAt: Date.now() };
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-fatal: caching is best-effort.
  }
}

/** Remove an entry from the IndexedDB cache (e.g. when a texture is deleted). */
export async function evictCachedTexture(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore.
  }
}

// ─── Pixel-decoding helper ────────────────────────────────────────────────────

interface RgbaResult {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Decode an image `Blob` to raw RGBA pixels using an `OffscreenCanvas`.
 * Throws when the blob cannot be decoded or the canvas context is unavailable.
 */
export async function decodeImageToRgba(blob: Blob): Promise<RgbaResult> {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('OffscreenCanvas 2d context unavailable');
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  return { width, height, data: new Uint8Array(imageData.data.buffer) };
}

// ─── Presigned URL cache ──────────────────────────────────────────────────────
// Presigned R2 URLs are valid for 1 hour. We keep them in a module-level Map
// so they survive React component unmount/remount cycles (e.g. when the texture
// panel is closed and reopened within the same browser session).

const PRESIGNED_URL_TTL_MS = 55 * 60 * 1000; // 55 min — 5 min safety margin

interface PresignedEntry {
  url: string;
  fetchedAt: number;
}

const presignedCache = new Map<string, PresignedEntry>();

/**
 * Returns a presigned thumbnail URL for `textureId`.
 * Served from in-memory cache if the entry is younger than 55 minutes;
 * otherwise re-fetches from `/api/textures/{id}`.
 */
export async function getPresignedUrl(textureId: string): Promise<string | null> {
  const cached = presignedCache.get(textureId);
  if (cached && Date.now() - cached.fetchedAt < PRESIGNED_URL_TTL_MS) {
    return cached.url;
  }

  try {
    const res = await fetch(`/api/textures/${textureId}`);
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url: string };
    presignedCache.set(textureId, { url, fetchedAt: Date.now() });
    return url;
  } catch {
    return null;
  }
}

/** Remove a presigned URL entry when a texture is deleted. */
export function evictPresignedUrl(id: string): void {
  presignedCache.delete(id);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Load texture RGBA data for `textureId` using the three-level cache hierarchy:
 *
 * 1. IndexedDB cache  — skip all network if data is fresh
 * 2. CDN              — `https://cdn.yourapp.com/cache/{id}.ktx2`
 * 3. Presigned R2 URL — `/api/textures/{id}` → presigned URL → R2
 *
 * Level 1 (engine memory) is intentionally **not** checked here; the caller
 * (`applyTextureToEngine`) handles that guard before invoking this function.
 *
 * On success, the decoded RGBA data is written to IndexedDB for future sessions.
 */
export async function loadTextureRgba(textureId: string): Promise<RgbaResult> {
  // ── Level 2: IndexedDB ────────────────────────────────────────────────────
  const cached = await getCachedTexture(textureId);
  if (cached) {
    return { width: cached.width, height: cached.height, data: cached.data };
  }

  // ── Level 3a: CDN ─────────────────────────────────────────────────────────
  let rgba: RgbaResult | null = null;

  try {
    const cdnRes = await fetch(cdnTextureUrl(textureId));
    if (cdnRes.ok) {
      const blob = await cdnRes.blob();
      rgba = await decodeImageToRgba(blob);
    }
  } catch {
    // CDN unavailable or decode failed — fall through to R2.
  }

  // ── Level 3b: Presigned R2 URL (authoritative fallback) ───────────────────
  if (!rgba) {
    const urlRes = await fetch(`/api/textures/${textureId}`);
    if (!urlRes.ok) {
      throw new Error(`[TextureCache] Could not resolve URL for texture ${textureId} (${urlRes.status})`);
    }
    const { url } = (await urlRes.json()) as { url: string };

    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      throw new Error(`[TextureCache] Failed to fetch texture from R2 (${imgRes.status})`);
    }

    rgba = await decodeImageToRgba(await imgRes.blob());
  }

  // Persist to IndexedDB for next time (best-effort, non-blocking).
  void setCachedTexture(textureId, rgba.width, rgba.height, rgba.data);

  return rgba;
}
