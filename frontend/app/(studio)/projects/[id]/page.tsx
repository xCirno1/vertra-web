'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import StudioLayout from '@/components/layouts/StudioLayout';
import SceneTree from '@/components/studio/sidebar/SceneTree';
import Viewport, { ViewportHandle } from '@/components/studio/Viewport';
import Toolbar from '@/components/studio/toolbar/Toolbar';
import Inspector from '@/components/studio/inspector/Inspector';
import BottomPanel from '@/components/studio/bottom-panel/BottomPanel';
import { useSceneStore } from '@/stores/sceneStore';
import { BufferPatch, useVertra } from '@/hooks/useVertra';
import { useVertraEngine } from '@/hooks/useVertraEngine';

import { DEFAULT_ENGINE_SCRIPT } from '@/lib/constants/defaultScript';
import {
  createProjectDraft,
  loadProjects,
  saveProject,
  syncLocalProjectsToCloud,
  type EngineProject,
  type ProjectSource,
} from '@/lib/storage/project-storage';
import { Skeleton } from '@/components/ui/skeleton';

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
    addEntity,
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

  const {
    engineState,
    engineError: vertraEngineError,
    engineMode,
    engineSelectedObject,
    play: playEngine,
    saveSceneVtr,
    loadSceneVtr,
    toggleEditorMode,
    sendEditorEvent,
    applyTransformToEngine,
    spawnObject,
  } = useVertraEngine();

  const viewportRef = useRef<ViewportHandle>(null);
  const didLogEngineLoading = useRef(false);
  const didLogEngineReady = useRef(false);
  const hasAutoStartedEngine = useRef(false);

  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>(['[INFO] Studio boot sequence started']);
  const [projectSource, setProjectSource] = useState<ProjectSource>('local');
  const [canSyncToCloud, setCanSyncToCloud] = useState(false);
  const [script, setScript] = useState<string>(DEFAULT_ENGINE_SCRIPT);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => [...prev, `[${level}] ${message}`].slice(-200));
  }, []);

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

      setCurrentProject(project);
      setProjectSource(result.source);
      setCanSyncToCloud(result.canSyncToCloud);
      // Restore saved script, fall back to default
      setScript(project.script ?? DEFAULT_ENGINE_SCRIPT);
      setIsProjectLoading(false);
      appendLog('SUCCESS', `Project loaded from ${result.source} storage.`);
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
  }, [appendLog, projectId, setCurrentProject]);

  useEffect(() => {
    if (isProjectLoading) {
      return;
    }

    if (scene.root.children.length > 0) {
      return;
    }

    addEntity('mesh', scene.root.id, 'Cube');
    addEntity('light', scene.root.id, 'Key Light');
    addEntity('camera', scene.root.id, 'Camera');
    appendLog('INFO', 'Initialized default entities for empty scene.');
  }, [addEntity, appendLog, isProjectLoading, scene.root.children.length, scene.root.id]);

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

  useEffect(() => {
    if (isProjectLoading || !isReady || engineState !== 'idle' || hasAutoStartedEngine.current) {
      return;
    }

    hasAutoStartedEngine.current = true;
    appendLog('INFO', 'Starting Vertra Engine in editor mode...');
    void playEngine(script);
  }, [appendLog, engineState, isProjectLoading, isReady, playEngine, script]);

  const handlePlayEngine = useCallback(() => {
    appendLog('INFO', 'Playing — going into play mode…');
    void playEngine(script);
  }, [appendLog, playEngine, script]);


  const handleSave = useCallback(async () => {
    const activeProject: EngineProject = {
      ...(currentProject || createProjectDraft(`Project ${projectId}`)),
      id: currentProject?.id || projectId,
      script,
      scene,
    };

    const destination = await saveProject(activeProject);
    setProjectSource(destination);

    const refreshed = await loadProjects();
    setCanSyncToCloud(refreshed.canSyncToCloud);
    appendLog('SUCCESS', `Project saved to ${destination} storage.`);
  }, [appendLog, currentProject, projectId, scene, script]);

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
    downloadBlob(blob, `${filePrefix || 'vertra-scene'}.vtr`);
    appendLog('SUCCESS', 'Scene snapshot saved as .vtr file.');
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

  const handleCreateObject = useCallback(
    async (objectData: { name: string; geometryType: 'cube' | 'box' | 'sphere' | 'pyramid' | 'plane'; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; color?: [number, number, number, number] }) => {
      const objectId = spawnObject(objectData);
      if (objectId === null) {
        appendLog('ERROR', `Failed to create object "${objectData.name}"`);
        throw new Error('Failed to spawn object in scene');
      }
      appendLog('SUCCESS', `Created object "${objectData.name}" (ID: ${objectId})`);
    },
    [spawnObject, appendLog]
  );

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
            onCreateObject={handleCreateObject}
            engineState={engineState}
            engineMode={engineMode}
            onPlayEngine={handlePlayEngine}
            onToggleEditorMode={toggleEditorMode}
          />
        }
        leftSidebar={<SceneTree />}
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
          />
        }
        rightSidebar={
          <Inspector
            onBufferPatch={handleTransformPatch}
            engineReady={isReady}
            engineLoading={isEngineLoading}
            engineSelectedObject={engineSelectedObject}
            onEngineTransformChange={handleEngineTransformChange}
          />
        }
        bottomPanel={
          <BottomPanel
            logs={[`[INFO] Active source: ${projectSource.toUpperCase()}`, ...logs]}
            isLoadingAssets={isEngineLoading}
            script={script}
            onScriptChange={setScript}
          />
        }
      />
    </motion.div>
  );
}
