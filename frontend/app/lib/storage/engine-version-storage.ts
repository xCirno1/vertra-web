import type { EngineVersion } from '@/lib/engine/engineCapabilities';
import { LATEST_ENGINE_VERSION, ENGINE_VERSIONS } from '@/lib/engine/engineCapabilities';

const GLOBAL_DEFAULT_KEY = 'vertra.default-engine-version';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isValidVersion(v: unknown): v is EngineVersion {
  return ENGINE_VERSIONS.includes(v as EngineVersion);
}

export function getGlobalEngineVersion(): EngineVersion {
  if (!isBrowser()) return LATEST_ENGINE_VERSION;
  const stored = window.localStorage.getItem(GLOBAL_DEFAULT_KEY);
  return isValidVersion(stored) ? stored : LATEST_ENGINE_VERSION;
}

export function setGlobalEngineVersion(version: EngineVersion): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(GLOBAL_DEFAULT_KEY, version);
}

export function resolveEngineVersion(projectOverride: EngineVersion | undefined): EngineVersion {
  return projectOverride ?? getGlobalEngineVersion();
}
