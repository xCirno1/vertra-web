// ─── Version registry ─────────────────────────────────────────────────────────

export const ENGINE_VERSIONS = ['v0.2.0', 'v0.3.0a1'] as const;
export type EngineVersion = (typeof ENGINE_VERSIONS)[number];

export const LATEST_ENGINE_VERSION: EngineVersion = 'v0.3.0a1';

// ─── Capability flags ─────────────────────────────────────────────────────────

export interface EngineCapabilities {
  /** Scene.attach_script / detach_script / has_script + JsScript class */
  perObjectScripting: boolean;
}

const CAPABILITY_MAP: Record<EngineVersion, EngineCapabilities> = {
  'v0.2.0': { perObjectScripting: false },
  'v0.3.0a1': { perObjectScripting: true },
};

export function getCapabilities(version: EngineVersion): EngineCapabilities {
  return CAPABILITY_MAP[version];
}

/** Returns the URL path (relative to Next.js public/) for the given version's JS entry-point. */
export function resolveEngineModulePath(version: EngineVersion): string {
  return `/engine/${version}/vertra_js.js`;
}

export const ENGINE_VERSION_LABELS: Record<EngineVersion, string> = {
  'v0.2.0': 'v0.2.0 (stable)',
  'v0.3.0a1': 'v0.3.0a1 (scripting preview)',
};
