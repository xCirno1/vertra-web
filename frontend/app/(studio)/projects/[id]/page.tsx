'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import StudioLayout from '@/components/layouts/StudioLayout';
import SceneTree from '@/components/studio/sidebar/SceneTree';
import ScriptWorkspace from '@/components/studio/sidebar/ScriptWorkspace';
import dynamic from 'next/dynamic';
const ScriptModal = dynamic(() => import('@/components/studio/inspector/ScriptModal'), { ssr: false });
import Viewport, { ViewportHandle } from '@/components/studio/Viewport';
import Toolbar from '@/components/studio/toolbar/Toolbar';
import Inspector from '@/components/studio/inspector/Inspector';
import BottomPanel from '@/components/studio/bottom-panel/BottomPanel';
import TexturePanel from '@/components/studio/textures/TexturePanel';
import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { BufferPatch, useVertra } from '@/hooks/useVertra';
import { useVertraEngine } from '@/hooks/useVertraEngine';
import type { EngineObjectProps } from '@/hooks/useVertraEngine';
import { getDefaultEngineScript } from '@/lib/constants/defaultScript';
import {
  createProjectDraft,
  loadProjects,
  saveProject,
  syncLocalProjectsToCloud,
  DEFAULT_PROJECT_SETTINGS,
  type EngineProject,
  type ProjectSettings,
  type ProjectSource,
} from '@/lib/storage/project-storage';
import { getCapabilities, type EngineVersion } from '@/lib/engine/engineCapabilities';
import EngineVersionPicker from '@/components/studio/toolbar/EngineVersionPicker';
import { Skeleton } from '@/components/ui/skeleton';
import type { TextureMeta } from '@/types/texture';
import { useScriptStore } from '@/stores/scriptStore';
import type { ScriptVfs } from '@/types/script';
import { composeScript, getDefaultScriptTabs, stripTypeAnnotations } from '@/components/studio/inspector/ScriptModal';
import { resolveEngineVersion } from '@/lib/storage/engine-version-storage';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === 'string' ? params.id : '1';
  const {
    scene,
    currentProject,
    setCurrentProject,
  } = useSceneStore();
  const {
    isReady,
    isLoading: isEngineLoading,
    error: engineError,
    moduleBytes,
    updateBuffer,
  } = useVertra();

  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>(['[INFO] Studio boot sequence started']);
  const [projectSource, setProjectSource] = useState<ProjectSource>('local');
  const [canSyncToCloud, setCanSyncToCloud] = useState(false);
  const [script, setScript] = useState<string>(getDefaultEngineScript());
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_SETTINGS);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedToken, setPublishedToken] = useState<string | null>(null);

  /** Left panel tab: scene graph or script workspace. */
  const [leftPanelTab, setLeftPanelTab] = useState<'scene' | 'scripts'>('scene');

  // ── Script VFS ────────────────────────────────────────────────────────────
  const { vfs, setVfs, updateFile, openScriptPath, closeScript } = useScriptStore();

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => [...prev, `[${level}] ${message}`].slice(-200));
  }, []);

  const {
    engineState,
    engineError: vertraEngineError,
    engineMode,
    engineSelectedObject,
    selectedObjectTexturePath,
    autosaveState,
    activeEngineVersion,
    play: playEngine,
    saveSceneVtr,
    loadSceneVtr,
    toggleEditorMode,
    sendEditorEvent,
    applyTransformToEngine,
    updateEngineObjectProps,
    applyTextureToEngine,
    spawnGeometry,
    deleteEngineObject,
    reparentEngineObject,
    selectEngineObject,
    attachScript,
    detachScript,
  } = useVertraEngine({
    projectId,
    autosaveEnabled: projectSettings.autosaveEnabled,
    engineVersion: projectSettings.engineVersion,
    onAutosaveError: (reason) => appendLog('WARN', `Autosave failed: ${reason}`),
  });

  // ── Textures ──────────────────────────────────────────────────────────────
  const [availableTextures, setAvailableTextures] = useState<TextureMeta[]>([]);
  const { texturePanelOpen, toggleTexturePanel } = useUIStore();

  const fetchTextures = useCallback(async () => {
    try {
      const res = await fetch(`/api/textures?project_id=${projectId}`);
      if (res.ok) {
        const data = (await res.json()) as TextureMeta[];
        setAvailableTextures(data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTextures();
  }, [fetchTextures]);

  const handleApplyTexture = useCallback(
    async (objectId: number, textureId: string) => {
      await applyTextureToEngine(objectId, textureId);
    },
    [applyTextureToEngine],
  );

  const viewportRef = useRef<ViewportHandle>(null);
  const didLogEngineLoading = useRef(false);
  const didLogEngineReady = useRef(false);
  const hasAutoStartedEngine = useRef(false);
  const vfsAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVfsHydrated = useRef(false);
  const vfsRef = useRef(vfs);

  useEffect(() => {
    vfsRef.current = vfs;
  }, [vfs]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setIsProjectLoading(true);
      appendLog('INFO', `Loading project ${projectId}...`);

      const result = await loadProjects();
      if (!mounted) {
        return;
      }

      let project = result.projects.find((item) => item.id === projectId);

      if (!project) {
        project = createProjectDraft(`Project ${projectId}`);
        project.id = projectId;
        await saveProject(project);
        appendLog('WARN', 'Project not found. Created a local draft project.');
      }

      const settings = { ...DEFAULT_PROJECT_SETTINGS, ...project.settings };

      setCurrentProject(project);
      setProjectSource(result.source);
      setCanSyncToCloud(result.canSyncToCloud);
      // Restore saved script, fall back to default
      setScript(project.script ?? getDefaultEngineScript());
      setProjectSettings(settings);
      setIsProjectLoading(false);
      appendLog('SUCCESS', `Project loaded from ${result.source} storage.`);

      // Load script VFS from cloud (non-fatal)
      fetch(`/api/scripts/${projectId}`, { credentials: 'same-origin' })
        .then(async (res) => {
          if (!res.ok || !mounted) return;
          const data = (await res.json()) as ScriptVfs;
          if (mounted) {
            setVfs(data);
            isVfsHydrated.current = true;
          }
        })
        .catch(() => {
          // No scripts saved yet — mark hydrated so edits from here trigger autosave.
          isVfsHydrated.current = true;
        });

      // Fetch publish state from cloud (if authenticated)
      if (result.source === 'cloud') {
        fetch(`/api/projects/${projectId}`, { credentials: 'same-origin' })
          .then(async (res) => {
            if (!res.ok) return;
            const data = (await res.json()) as {
              is_published?: boolean;
              published_token?: string | null;
            };
            if (!mounted) return;
            setIsPublished(data.is_published ?? false);
            setPublishedToken(data.published_token ?? null);
          })
          .catch(() => { /* non-fatal */ });
      }
    };

    bootstrap().catch((error) => {
      if (!mounted) {
        return;
      }

      const reason = error instanceof Error ? error.message : 'Unknown error';
      appendLog('ERROR', `Unable to load project: ${reason}`);
      setIsProjectLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [appendLog, projectId, setCurrentProject, setVfs]);

  useEffect(() => {
    if (isEngineLoading && !didLogEngineLoading.current) {
      appendLog('INFO', 'Vertra engine is initializing in the background.');
      didLogEngineLoading.current = true;
    }
  }, [appendLog, isEngineLoading]);

  useEffect(() => {
    if (isReady && !didLogEngineReady.current) {
      appendLog('SUCCESS', `Vertra engine ready (${moduleBytes} bytes loaded).`);
      didLogEngineReady.current = true;
    }
  }, [appendLog, isReady, moduleBytes]);

  useEffect(() => {
    if (!engineError) {
      return;
    }

    appendLog('ERROR', engineError.message);
  }, [appendLog, engineError]);

  useEffect(() => {
    if (vertraEngineError) {
      appendLog('ERROR', `Vertra Engine: ${vertraEngineError}`);
    }
  }, [appendLog, vertraEngineError]);

  useEffect(() => {
    if (engineState === 'running') {
      appendLog('SUCCESS', 'Vertra Engine started — simulation running.');
    } else if (engineState === 'idle' && vertraEngineError === null) {
      // Only log stop message after it was running (not on first render)
    }
  }, [appendLog, engineState, vertraEngineError]);

  // Debounced script VFS autosave — fires 2 s after the last VFS mutation.
  useEffect(() => {
    if (!isVfsHydrated.current) return;
    if (vfsAutosaveTimerRef.current) clearTimeout(vfsAutosaveTimerRef.current);
    vfsAutosaveTimerRef.current = setTimeout(() => {
      fetch(`/api/scripts/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(vfs),
      }).catch(() => { /* non-fatal */ });
    }, 2000);
    return () => {
      if (vfsAutosaveTimerRef.current) clearTimeout(vfsAutosaveTimerRef.current);
    };
  }, [vfs, projectId]);

  useEffect(() => {
    if (isProjectLoading || !isReady || engineState !== 'idle' || hasAutoStartedEngine.current) {
      return;
    }

    hasAutoStartedEngine.current = true;
    appendLog('INFO', 'Starting Vertra Engine in editor mode...');

    fetch(`/api/vtr/${projectId}`).then(async (res) => {
      let initialVtrBytes: Uint8Array | undefined;
      if (res.ok) {
        initialVtrBytes = new Uint8Array(await res.arrayBuffer());
        appendLog('SUCCESS', 'Scene snapshot fetched — will restore on startup.');
      } else if (res.status !== 404) {
        appendLog('WARN', `VTR fetch responded ${res.status} — starting with empty scene.`);
      }
      void playEngine(stripTypeAnnotations(script), initialVtrBytes);
    }).catch((err: unknown) => {
      const reason = err instanceof Error ? err.message : String(err);
      appendLog('WARN', `VTR fetch failed: ${reason} — starting with empty scene.`);
      void playEngine(stripTypeAnnotations(script));
    });
  }, [appendLog, engineState, isProjectLoading, isReady, playEngine, projectId, script]);

  const handlePlayEngine = useCallback(() => {
    appendLog('INFO', 'Starting Vertra Engine…');
    void playEngine(stripTypeAnnotations(script));
  }, [appendLog, playEngine, script]);

  const handleSave = useCallback(async () => {
    const activeProject: EngineProject = {
      ...(currentProject || createProjectDraft(`Project ${projectId}`)),
      id: currentProject?.id || projectId,
      script,
      scene,
      settings: projectSettings,
    };

    const destination = await saveProject(activeProject);
    setProjectSource(destination);

    const refreshed = await loadProjects();
    setCanSyncToCloud(refreshed.canSyncToCloud);
    appendLog('SUCCESS', `Project saved to ${destination} storage.`);

    // Persist script VFS to cloud (non-fatal)
    fetch(`/api/scripts/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(vfs),
    }).catch(() => { /* non-fatal */ });
  }, [appendLog, currentProject, projectId, projectSettings, scene, script, vfs]);

  const handleExportPng = useCallback(async () => {
    const blob = await viewportRef.current?.captureScreenshot();

    if (!blob) {
      appendLog('WARN', 'Viewport screenshot is not available yet.');
      return;
    }

    const filePrefix = normalizeFileName(currentProject?.name || `project-${projectId}`);
    downloadBlob(blob, `${filePrefix || 'vertra-scene'}.png`);
    appendLog('SUCCESS', 'Exported viewport screenshot as PNG.');
  }, [appendLog, currentProject?.name, projectId]);

  const handleSaveVtr = useCallback(async () => {
    let bytes: Uint8Array;
    try {
      bytes = await saveSceneVtr();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      appendLog('ERROR', `VTR save failed: ${reason}`);
      return;
    }

    const plainBuffer = new Uint8Array(bytes).buffer as ArrayBuffer;
    const blob = new Blob([plainBuffer], { type: 'application/octet-stream' });
    const filePrefix = normalizeFileName(currentProject?.name || `project-${projectId}`);

    // 1. Local download (always runs first so the user never loses the file)
    downloadBlob(blob, `${filePrefix || 'vertra-scene'}.vtr`);
    appendLog('SUCCESS', 'Scene snapshot saved as .vtr file.');

    // 2. Cloud upload — non-fatal; errors are surfaced as warnings
    try {
      const res = await fetch(`/api/vtr/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: plainBuffer,
      });
      if (res.ok) {
        appendLog('SUCCESS', 'Scene snapshot uploaded to cloud (R2).');
      } else {
        appendLog('WARN', `Cloud upload responded ${res.status} — snapshot saved locally only.`);
      }
    } catch (uploadErr) {
      const reason = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      appendLog('WARN', `Cloud upload failed: ${reason} — snapshot saved locally only.`);
    }
  }, [appendLog, currentProject?.name, projectId, saveSceneVtr]);

  const handleLoadVtr = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result;
      if (!(buf instanceof ArrayBuffer)) {
        appendLog('ERROR', 'Failed to read .vtr file.');
        return;
      }
      try {
        loadSceneVtr(new Uint8Array(buf));
        appendLog('SUCCESS', `Loaded scene from “${file.name}”.`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        appendLog('ERROR', `VTR load failed: ${reason}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [appendLog, loadSceneVtr]);

  const handleSyncToCloud = useCallback(async () => {
    const synced = await syncLocalProjectsToCloud();

    if (synced === 0) {
      appendLog('WARN', 'No local projects were synced.');
    } else {
      appendLog('SUCCESS', `Synced ${synced} project(s) to cloud.`);
    }

    const refreshed = await loadProjects();
    setCanSyncToCloud(refreshed.canSyncToCloud);
    setProjectSource(refreshed.source);
  }, [appendLog]);

  const handleTransformPatch = useCallback(
    async (patch: BufferPatch) => {
      try {
        await updateBuffer(patch);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown bridge failure';
        appendLog('ERROR', `Buffer update failed: ${reason}`);
      }
    },
    [appendLog, updateBuffer]
  );

  const handleToggleAutosave = useCallback(() => {
    setProjectSettings((prev) => ({ ...prev, autosaveEnabled: !prev.autosaveEnabled }));
  }, []);

  const handleEngineVersionChange = useCallback((version: EngineVersion | undefined) => {
    setProjectSettings((prev) => ({ ...prev, engineVersion: version }));
  }, []);

  const handleEngineTransformChange = useCallback(
    (
      id: number,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number],
    ) => {
      applyTransformToEngine(id, position, rotation, scale);
    },
    [applyTransformToEngine]
  );

  const handleRenameProject = useCallback(
    async (name: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
          credentials: 'same-origin',
        });
        if (!res.ok) {
          appendLog('WARN', `Rename failed: HTTP ${res.status}`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        appendLog('WARN', `Rename failed: ${reason}`);
      }
    },
    [appendLog, projectId]
  );

  const handlePublish = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        appendLog('WARN', `Publish failed: HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { is_published: boolean; published_token: string | null };
      setIsPublished(data.is_published);
      setPublishedToken(data.published_token ?? null);
      appendLog('SUCCESS', 'Project published — public link is now active.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      appendLog('ERROR', `Publish failed: ${reason}`);
    }
  }, [appendLog, projectId]);

  const handleUnpublish = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        appendLog('WARN', `Unpublish failed: HTTP ${res.status}`);
        return;
      }
      setIsPublished(false);
      appendLog('SUCCESS', 'Project unpublished — public link is now inactive.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      appendLog('ERROR', `Unpublish failed: ${reason}`);
    }
  }, [appendLog, projectId]);

  const handleEngineObjectPropsChange = useCallback(
    (id: number, props: EngineObjectProps) => {
      updateEngineObjectProps(id, props);
    },
    [updateEngineObjectProps]
  );

  const editorEngineVersion = activeEngineVersion ?? resolveEngineVersion(projectSettings.engineVersion);

  useEffect(() => {
    if (engineState !== 'running') return;
    if (!getCapabilities(editorEngineVersion).perObjectScripting) return;

    for (const [objectId, scriptPath] of Object.entries(vfs.bindings)) {
      const file = vfsRef.current.files[scriptPath];
      if (!file) continue;
      attachScript(Number(objectId), stripTypeAnnotations(composeScript(file.tabs)));
    }
  }, [attachScript, editorEngineVersion, engineState, vfs.bindings]);

  if (isProjectLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-screen w-screen flex-col gap-3 bg-vertra-bg p-4"
      >
        <Skeleton className="h-12 w-full" />
        <div className="grid h-full grid-cols-[280px_1fr_320px] gap-3">
          <Skeleton className="h-full w-full" />
          <Skeleton className="h-full w-full" />
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-36 w-full" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-screen h-screen overflow-hidden"
    >
      <StudioLayout
        toolbar={
          <Toolbar
            onSave={handleSave}
            onExportPng={handleExportPng}
            onSyncToCloud={handleSyncToCloud}
            canSyncToCloud={canSyncToCloud}
            onSaveVtr={handleSaveVtr}
            onLoadVtr={handleLoadVtr}
            engineState={engineState}
            engineMode={engineMode}
            onPlayEngine={handlePlayEngine}
            onToggleEditorMode={toggleEditorMode}
            onSpawnGeometry={spawnGeometry}
            autosaveState={autosaveState}
            autosaveEnabled={projectSettings.autosaveEnabled}
            onToggleAutosave={handleToggleAutosave}
            onRenameProject={handleRenameProject}
            isPublished={isPublished}
            publishedToken={publishedToken}
            onPublish={projectSource === 'cloud' ? handlePublish : undefined}
            onUnpublish={projectSource === 'cloud' ? handleUnpublish : undefined}
            settingsSlot={
              <EngineVersionPicker
                projectVersion={projectSettings.engineVersion}
                onProjectVersionChange={handleEngineVersionChange}
              />
            }
          />
        }
        leftSidebar={
          <>
            {/* Tab toggle */}
            <div className="flex shrink-0 border-b border-vertra-border/40 bg-vertra-surface/60">
              <button
                onClick={() => setLeftPanelTab('scene')}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${leftPanelTab === 'scene'
                  ? 'text-vertra-cyan border-b-2 border-vertra-cyan -mb-px'
                  : 'text-vertra-text-dim hover:text-vertra-text'
                  }`}
              >
                Scene
              </button>
              <button
                onClick={() => setLeftPanelTab('scripts')}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${leftPanelTab === 'scripts'
                  ? 'text-vertra-cyan border-b-2 border-vertra-cyan -mb-px'
                  : 'text-vertra-text-dim hover:text-vertra-text'
                  }`}
              >
                Scripts
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {leftPanelTab === 'scene' ? (
                <SceneTree
                  onDeleteEntity={deleteEngineObject}
                  onReparentEntity={reparentEngineObject}
                  onSelectEntity={selectEngineObject}
                />
              ) : (
                <ScriptWorkspace />
              )}
            </div>
            {texturePanelOpen && (
              <TexturePanel
                projectId={projectId}
                selectedObjectId={engineSelectedObject?.id}
                onApplyTexture={handleApplyTexture}
                onClose={() => toggleTexturePanel()}
              />
            )}

            {/* File-edit ScriptModal opened from Script Workspace */}
            {openScriptPath && (
              <ScriptModal
                mode="file"
                scriptPath={openScriptPath}
                scriptTabs={vfs.files[openScriptPath]?.tabs ?? getDefaultScriptTabs()}
                onScriptTabsChange={(tabs) => updateFile(openScriptPath, { tabs })}
                onSave={() => closeScript()}
                onClose={() => closeScript()}
                engineVersion={editorEngineVersion}
              />
            )}
          </>
        }
        centerViewport={
          <Viewport
            ref={viewportRef}
            isEngineReady={isReady}
            isEngineLoading={isEngineLoading}
            entityCount={Math.max(scene.entities.size - 1, 0)}
            engineState={engineState}
            engineError={vertraEngineError}
            isEditorMode={engineMode === 'editor'}
            sendEditorEvent={sendEditorEvent}
            onTextureDrop={(textureId) => {
              const selectedId = engineSelectedObject?.id;
              if (selectedId !== undefined) {
                void handleApplyTexture(selectedId, textureId);
              }
            }}
          />
        }
        rightSidebar={
          <Inspector
            onBufferPatch={handleTransformPatch}
            engineReady={isReady}
            engineLoading={isEngineLoading}
            engineSelectedObject={engineSelectedObject}
            engineSelectedTexturePath={selectedObjectTexturePath}
            onEngineTransformChange={handleEngineTransformChange}
            onEngineObjectPropsChange={handleEngineObjectPropsChange}
            availableTextures={availableTextures}
            onApplyTexture={handleApplyTexture}
            activeEngineVersion={activeEngineVersion}
            onAttachScript={attachScript}
            onDetachScript={detachScript}
          />
        }
        bottomPanel={
          <BottomPanel
            logs={[`[INFO] Active source: ${projectSource.toUpperCase()}`, ...logs]}
            isLoadingAssets={isEngineLoading}
            script={script}
            onScriptChange={setScript}
            engineVersion={editorEngineVersion}
          />
        }
      />
    </motion.div>
  );
}
