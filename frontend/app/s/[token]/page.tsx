'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useVertra } from '@/hooks/useVertra';
import { useVertraEngine } from '@/hooks/useVertraEngine';
import { getCapabilities } from '@/lib/engine/engineCapabilities';
import { composeScript, stripTypeAnnotations } from '@/lib/scripts/runtime';
import { EMPTY_VFS, type ScriptVfs } from '@/types/script';

interface PublicProject {
  id: string;
  name: string;
  description?: string;
  script?: string;
}

export default function PublicViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [project, setProject] = useState<PublicProject | null>(null);
  const [scriptVfs, setScriptVfs] = useState<ScriptVfs>(EMPTY_VFS);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [isScriptsHydrated, setIsScriptsHydrated] = useState(false);
  const hasStarted = useRef(false);
  const hasEnteredPlayMode = useRef(false);

  const { isReady, moduleBytes } = useVertra();
  const {
    play,
    toggleEditorMode,
    attachScript,
    engineState,
    engineError,
    activeEngineVersion,
  } = useVertraEngine({ autosaveEnabled: false });

  // Load project metadata
  useEffect(() => {
    let cancelled = false;

    hasStarted.current = false;
    hasEnteredPlayMode.current = false;
    setProject(null);
    setProjectError(null);
    setScriptVfs(EMPTY_VFS);
    setIsProjectLoading(true);
    setIsScriptsHydrated(false);

    const load = async () => {
      try {
        const res = await fetch(`/api/projects/public/${token}`);
        if (!res.ok) {
          if (cancelled) return;
          setProjectError(
            res.status === 404
              ? 'This project is not public or does not exist.'
              : 'Failed to load project.',
          );
          return;
        }
        const data = (await res.json()) as PublicProject;
        if (cancelled) return;
        setProject(data);

        try {
          const scriptsRes = await fetch(`/api/scripts/s/${token}`);
          if (!scriptsRes.ok || cancelled) return;

          const scriptsData = (await scriptsRes.json()) as Partial<ScriptVfs>;
          if (cancelled) return;

          setScriptVfs({
            files: scriptsData.files ?? {},
            bindings: scriptsData.bindings ?? {},
          });
        } catch {
          // Published projects may not have a script VFS yet.
        }
      } catch {
        if (cancelled) return;
        setProjectError('Failed to load project.');
      } finally {
        if (cancelled) return;
        setIsScriptsHydrated(true);
        setIsProjectLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Start engine once both project metadata and WASM module are ready
  useEffect(() => {
    if (!project || !isReady || !isScriptsHydrated || engineState !== 'idle' || hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    const start = async () => {
      const mainScript = stripTypeAnnotations(project.script ?? '');

      try {
        const vtrRes = await fetch(`/api/vtr/s/${token}`);
        let vtrBytes: Uint8Array | undefined;
        if (vtrRes.ok) {
          vtrBytes = new Uint8Array(await vtrRes.arrayBuffer());
        }
        await play(mainScript, vtrBytes);
      } catch {
        // If VTR fetch failed entirely, still start without a snapshot
        await play(mainScript);
      }
    };

    void start();
  }, [engineState, isReady, isScriptsHydrated, play, project, token]);

  useEffect(() => {
    if (engineState !== 'running' || hasEnteredPlayMode.current || !activeEngineVersion) {
      return;
    }

    if (getCapabilities(activeEngineVersion).perObjectScripting) {
      for (const [objectId, scriptPath] of Object.entries(scriptVfs.bindings)) {
        const file = scriptVfs.files[scriptPath];
        if (!file) continue;

        attachScript(Number(objectId), stripTypeAnnotations(composeScript(file.tabs)));
      }
    }

    toggleEditorMode();
    hasEnteredPlayMode.current = true;
  }, [activeEngineVersion, attachScript, engineState, scriptVfs, toggleEditorMode]);

  if (isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-vertra-bg">
        <Loader2 className="h-6 w-6 animate-spin text-vertra-cyan" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-vertra-bg">
        <p className="text-sm text-vertra-text-dim">{projectError}</p>
        <p className="text-[10px] text-vertra-text-dim/40">Powered by Vertra</p>
      </div>
    );
  }

  const isEngineRunning = engineState === 'running';
  const isEngineStarting = engineState === 'loading';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-vertra-bg">
      {/* The WASM engine attaches to the canvas with id="vertra-canvas" */}
      <canvas
        id="vertra-canvas"
        className="absolute inset-0 h-full w-full"
        style={{ display: isEngineRunning ? 'block' : 'none' }}
      />

      {/* Loading overlay — shown until engine is fully running */}
      {(isEngineStarting || !isEngineRunning) && !engineError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-vertra-bg">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-vertra-cyan" />
            <p className="text-xs text-vertra-text-dim">
              {moduleBytes > 0 ? 'Starting simulation…' : 'Loading engine…'}
            </p>
          </div>
        </div>
      )}

      {/* Engine error overlay */}
      {engineError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-vertra-bg">
          <p className="text-sm text-vertra-error">Engine error: {engineError}</p>
        </div>
      )}

      {/* Project name (top-left) */}
      {project && isEngineRunning && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 select-none">
          <p className="text-xs font-medium text-white/50">{project.name}</p>
        </div>
      )}

      {/* Powered-by badge (bottom-right) */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 select-none">
        <p className="text-[10px] text-white/30">Powered by Vertra</p>
      </div>
    </div>
  );
}
