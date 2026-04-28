'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import init, { VertraObject, Geometry, Transform, Camera } from '../../public/engine/vertra_binder.js';
import type { WebWindow, Scene, FrameContext, InspectorData, EditorEventPayload } from '../../public/engine/vertra_binder.js';
import { useSceneStore } from '@/stores/sceneStore';
import { loadTextureRgba } from '@/lib/storage/texture-cache';
import type { Entity as SceneEntity, Scene as ReactScene } from '@/types/scene';

export type EngineState = 'idle' | 'loading' | 'running' | 'error';
export type GeometryType = 'cube' | 'sphere' | 'plane' | 'box' | 'pyramid';
export type AutosaveState = 'idle' | 'saving' | 'saved';
export type { InspectorData, EditorEventPayload };

export interface EngineObjectProps {
  name?: string;
  strId?: string;
  color?: [number, number, number, number];
  /** Set to a texture ID to apply that texture; null/undefined to remove */
  texturePath?: string | null;
}

interface UseVertraEngineReturn {
  engineState: EngineState;
  engineError: string | null;
  engineMode: 'editor' | 'play' | null;
  engineSelectedObject: InspectorData | undefined;
  autosaveState: AutosaveState;
  play: (script: string, initialVtrBytes?: Uint8Array) => Promise<void>;
  stop: () => void;
  saveSceneVtr: () => Promise<Uint8Array>;
  loadSceneVtr: (bytes: Uint8Array) => void;
  toggleEditorMode: () => void;
  sendEditorEvent: (payload: EditorEventPayload) => void;
  applyTransformToEngine: (
    id: number,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => void;
  updateEngineObjectProps: (id: number, props: EngineObjectProps) => void;
  /**
   * Fetch a texture from R2 by its ID, decode it to RGBA pixels, upload it
   * to the engine, and apply it to the specified object.
   */
  applyTextureToEngine: (objectId: number, textureId: string) => Promise<void>;
  spawnGeometry: (type: GeometryType, name?: string) => number | null;
  deleteEngineObject: (id: number) => void;
  reparentEngineObject: (id: number, newParentId: number | null) => void;
}

// Shape of the object the user script must return.
interface UserScriptHandlers {
  initialState: unknown;
  onStartup?: (state: unknown, scene: Scene) => void;
  onUpdate?: (state: unknown, scene: Scene, ctx: FrameContext) => void;
  onEvent?: (state: unknown, scene: Scene, event: unknown) => void;
}

// Internal VTR save/load bridge — checked inside on_update each tick.
interface VtrBridge {
  saveCallback: ((bytes: Uint8Array) => void) | null;
  loadData: Uint8Array | null;
}

type EditorStateEvent =
  | { type: 'gizmo_mode_changed' | 'GizmoModeChanged'; mode?: string }
  | { type: 'drag_start' | 'DragStart'; axis?: string }
  | { type: 'drag_end' | 'DragEnd' }
  | { type: 'selection_changed' | 'SelectionChanged' }
  | { type: string;[key: string]: unknown };

/** Execute user script in a sandboxed function with engine globals injected. */
function executeUserScript(scriptBody: string): UserScriptHandlers {
  const factory = new Function(
    'VertraObject',
    'Geometry',
    'Transform',
    'Camera',
    scriptBody,
  );
  return factory(VertraObject, Geometry, Transform, Camera) as UserScriptHandlers;
}

// ─── Engine → React scene sync ────────────────────────────────────────────────

/**
 * Stable root ID used for the synthetic scene-root entity in the React store.
 * Kept constant so re-renders don't treat it as a new node.
 */
const ENGINE_ROOT_ID = 'engine-world-root';

/** Heuristic: map an engine object name to a SceneTree display type. */
function inferEntityType(name: string): SceneEntity['type'] {
  const lower = name.toLowerCase();
  if (/\blight\b|lamp|spotlight|directional|sun/.test(lower)) return 'light';
  if (/\bcamera\b|\bcam\b/.test(lower)) return 'camera';
  return 'mesh';
}

/** Snapshot the engine world and produce a React Scene for the store. */
function buildReactSceneFromWorld(engineScene: Scene): ReactScene {
  const entities = new Map<string, SceneEntity>();

  const rootChildIds = Array.from(engineScene.world.get_roots()).map((id) => String(id));
  const root: SceneEntity = {
    id: ENGINE_ROOT_ID,
    name: 'Scene',
    type: 'group',
    children: rootChildIds,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: {},
    visible: true,
    locked: false,
    tags: [],
  };
  entities.set(ENGINE_ROOT_ID, root);

  function addObject(id: number): void {
    const obj = engineScene.world.get_object(id);
    if (!obj) return;

    const strId = id.toString();
    const t = obj.transform;
    const pos = t.position;
    const rot = t.rotation;
    const sc = t.scale;
    const childIds = Array.from(obj.children).map((cid) => String(cid));
    const parentStrId = obj.parent !== undefined ? obj.parent.toString() : ENGINE_ROOT_ID;

    entities.set(strId, {
      id: strId,
      name: obj.name,
      type: inferEntityType(obj.name),
      parentId: parentStrId,
      children: childIds,
      transform: {
        position: { x: pos[0], y: pos[1], z: pos[2] },
        rotation: { x: rot[0], y: rot[1], z: rot[2], order: 'XYZ' },
        scale: { x: sc[0], y: sc[1], z: sc[2] },
      },
      components: {},
      visible: true,
      locked: false,
      tags: [],
    });

    for (const childId of obj.children) {
      addObject(childId);
    }
  }

  for (const rootId of engineScene.world.get_roots()) {
    addObject(rootId);
  }

  return {
    version: '2024-1',
    root,
    entities,
    metadata: { gridSize: 1.0, backgroundColor: '#0a0a0c', renderScale: 1.0 },
  };
}

/** Empty React scene shown when no engine is running. */
function createEmptyReactScene(): ReactScene {
  const root: SceneEntity = {
    id: ENGINE_ROOT_ID,
    name: 'Scene',
    type: 'group',
    children: [],
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: {},
    visible: true,
    locked: false,
    tags: [],
  };
  return {
    version: '2024-1',
    root,
    entities: new Map([[ENGINE_ROOT_ID, root]]),
    metadata: { gridSize: 1.0, backgroundColor: '#0a0a0c', renderScale: 1.0 },
  };
}

interface UseVertraEngineOptions {
  /** Project ID used for the autosave R2 upload endpoint. */
  projectId?: string;

  /** When false, autosave is disabled entirely. Defaults to true. */
  autosaveEnabled?: boolean;
  /** Called after a successful autosave upload. */
  onAutosaveSuccess?: () => void;
  /** Called when an autosave upload fails. */
  onAutosaveError?: (reason: string) => void;
}

export function useVertraEngine(options: UseVertraEngineOptions = {}): UseVertraEngineReturn {
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<'editor' | 'play' | null>(null);
  const [engineSelectedObject, setEngineSelectedObject] = useState<InspectorData | undefined>(undefined);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');

  const engineRef = useRef<WebWindow | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const vtrBridge = useRef<VtrBridge>({ saveCallback: null, loadData: null });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to options so closures captured at engine-start always see fresh values.
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  /**
   * Debounced VTR autosave: waits 5 s after the last mutation, then calls
   * scene.save_vtr() directly (safe — WASM is single-threaded in browsers)
   * and uploads the bytes to R2.
   */
  const triggerVtrAutosave = useCallback(() => {
    if (optionsRef.current.autosaveEnabled === false) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const scene = sceneRef.current;
      const { projectId, onAutosaveSuccess, onAutosaveError } = optionsRef.current;
      if (!scene || !projectId) return;

      let bytes: Uint8Array;
      try {
        bytes = scene.save_vtr();
      } catch (err) {
        onAutosaveError?.(err instanceof Error ? err.message : String(err));
        return;
      }
      if (bytes.length === 0) {
        onAutosaveError?.('save_vtr returned empty bytes');
        return;
      }

      setAutosaveState('saving');
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      fetch(`/api/vtr/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer,
      }).then(res => {
        if (res.ok) {
          onAutosaveSuccess?.();
          setAutosaveState('saved');
          if (autosaveSavedTimerRef.current) clearTimeout(autosaveSavedTimerRef.current);
          autosaveSavedTimerRef.current = setTimeout(() => setAutosaveState('idle'), 3000);
        } else {
          onAutosaveError?.(`HTTP ${res.status}`);
          setAutosaveState('idle');
        }
      }).catch((err: unknown) => {
        onAutosaveError?.(err instanceof Error ? err.message : String(err));
        setAutosaveState('idle');
      });
    }, 2000);
  }, []);

  const play = useCallback(async (script: string, initialVtrBytes?: Uint8Array) => {
    if (engineState === 'running' || engineState === 'loading') return;

    setEngineState('loading');
    setEngineError(null);

    try {
      await init();

      // Parse user script — throws a visible error if malformed.
      let handlers: UserScriptHandlers;
      try {
        handlers = executeUserScript(script);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Script error: ${msg}`);
      }

      const { initialState, onStartup, onUpdate, onEvent } = handlers;

      const win = new (
        (await import('../../public/engine/vertra_binder.js')).WebWindow
      )(
        new Camera({
          position: [0.0, 8.0, -12.0],
          lr_rot: 90.0,
          ud_rot: -30,
        }),
        initialState,
      ) as WebWindow;

      // Event handler
      if (onEvent) {
        win.with_event_handler((state: unknown, scene: Scene, event: unknown) => {
          try {
            onEvent(state, scene, event);
          } catch {
            /* user script errors in event handler are silently swallowed */
          }
        });
      }

      // Startup logic
      win.on_startup((state: unknown, scene: Scene) => {
        // Load VTR snapshot first so the scene is restored before editor mode activates.
        if (initialVtrBytes && initialVtrBytes.length > 0) {
          try {
            scene.load_vtr(initialVtrBytes);
          } catch (err) {
            console.error('[Vertra] on_startup load_vtr error:', err);
          }
        }
        scene.world.on_scene_graph_modified((_event: unknown) => {
          const scene = sceneRef.current;
          if (!scene) return;
          useSceneStore.getState().setScene(buildReactSceneFromWorld(scene));
        });
        // Enable editor mode so the scene starts with gizmos and object picking
        scene.enable_editor_mode();
        sceneRef.current = scene;
        setEngineMode('editor');

        if (onStartup) {
          try {
            onStartup(state, scene);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[Vertra] onStartup error:', msg);
          }
        }

        // Populate the React scene store with all objects present after startup
        // (covers both VTR-restored objects and anything spawned by onStartup).
        useSceneStore.getState().setScene(buildReactSceneFromWorld(scene));
      });

      // Keep editor-side UI in sync with editor state transitions.
      win.on_editor_event((event: EditorStateEvent) => {
        const eventType = event?.type;
        if (!eventType) return;

        if (eventType === 'selection_changed' || eventType === 'SelectionChanged') {
          const inspectorData = sceneRef.current?.editor.inspector() as InspectorData | undefined;
          setEngineSelectedObject(inspectorData);
          return;
        }

        // After transform dragging ends, refresh the latest inspector snapshot.
        if (eventType === 'drag_end' || eventType === 'DragEnd') {
          const inspectorData = sceneRef.current?.editor.inspector() as InspectorData | undefined;
          setEngineSelectedObject(inspectorData);
        }

        // Trigger autosave for any event that is NOT a pure view-state change.
        // This covers drag_end, any future mutation events, etc.
        if (
          eventType !== 'gizmo_mode_changed' &&
          eventType !== 'GizmoModeChanged' &&
          eventType !== 'drag_start' &&
          eventType !== 'DragStart' &&
          eventType !== 'selection_changed' &&
          eventType !== 'SelectionChanged'
        ) {
          triggerVtrAutosave();
        }
      });

      // Update loop — also handles the VTR save/load bridge
      win.on_update((state: unknown, scene: Scene, ctx: FrameContext) => {
        // VTR save: resolve the promise with the bytes
        if (vtrBridge.current.saveCallback) {
          try {
            const bytes = scene.save_vtr();
            vtrBridge.current.saveCallback(bytes);
          } catch {
            vtrBridge.current.saveCallback(new Uint8Array(0));
          }
          vtrBridge.current.saveCallback = null;
        }

        // VTR load: feed the bytes into the scene
        if (vtrBridge.current.loadData) {
          try {
            scene.load_vtr(vtrBridge.current.loadData);
          } catch (err) {
            console.error('[Vertra] load_vtr error:', err);
          }
          vtrBridge.current.loadData = null;
        }

        if (onUpdate) {
          try {
            onUpdate(state, scene, ctx);
          } catch {
            /* user script errors in update are silently swallowed */
          }
        }
      });

      win.start('vertra-canvas');
      engineRef.current = win;
      setEngineState('running');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start engine';
      setEngineError(message);
      setEngineState('error');
      engineRef.current = null;
    }
  }, [engineState, triggerVtrAutosave]);

  const stop = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (autosaveSavedTimerRef.current) {
      clearTimeout(autosaveSavedTimerRef.current);
      autosaveSavedTimerRef.current = null;
    }
    setAutosaveState('idle');
    sceneRef.current = null;
    setEngineMode(null);
    setEngineSelectedObject(undefined);
    useSceneStore.getState().setScene(createEmptyReactScene());
    if (engineRef.current) {
      try {
        engineRef.current.free();
      } catch {
        // free() may throw if the engine already cleaned itself up.
      }
      engineRef.current = null;
    }
    vtrBridge.current.saveCallback = null;
    vtrBridge.current.loadData = null;
    setEngineState('idle');
    setEngineError(null);
  }, []);

  /**
   * Request a VTR snapshot from the running engine.
   * Resolves on the next update tick.
   * Rejects immediately if the engine is not running.
   */
  const saveSceneVtr = useCallback((): Promise<Uint8Array> => {
    if (!engineRef.current) {
      return Promise.reject(new Error('Engine is not running'));
    }
    return new Promise<Uint8Array>((resolve) => {
      vtrBridge.current.saveCallback = resolve;
    });
  }, []);

  /**
   * Feed VTR bytes into the running engine on the next update tick.
   * Throws immediately if the engine is not running.
   */
  const loadSceneVtr = useCallback((bytes: Uint8Array): void => {
    if (!engineRef.current) {
      throw new Error('Engine is not running');
    }
    vtrBridge.current.loadData = bytes;
  }, []);

  /** Toggle between editor mode and play mode within the running engine. */
  const toggleEditorMode = useCallback((): void => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (scene.editor.is_editor_mode()) {
      scene.disable_editor_mode();
      setEngineMode('play');
      setEngineSelectedObject(undefined);
    } else {
      scene.enable_editor_mode();
      setEngineMode('editor');
    }
  }, []);

  /** Forward an input event to the editor subsystem. No-op when engine is not running. */
  const sendEditorEvent = useCallback((payload: EditorEventPayload): void => {
    sceneRef.current?.editor.editor_event(payload);
  }, []);

  /**
   * Apply a transform change to a world object by ID.
   * All rotation values are in degrees (matching InspectorData.rotation_deg).
   */
  const applyTransformToEngine = useCallback((
    id: number,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ): void => {
    const scene = sceneRef.current;
    if (!scene) return;
    const obj = scene.world.get_object(id);
    if (!obj) return;
    const t = obj.transform;
    t.position = new Float32Array(position);
    t.rotation = new Float32Array(rotation);
    t.scale = new Float32Array(scale);
    obj.transform = t;
    triggerVtrAutosave();
  }, [triggerVtrAutosave]);

  /**
   * Update the name, str_id, or color of a live world object.
   * Only refreshes the inspector snapshot for name/strId changes (not color),
   * because color is managed as local state in the Inspector component and
   * calling setEngineSelectedObject on every color tick causes full page rerenders.
   */
  const updateEngineObjectProps = useCallback((id: number, props: EngineObjectProps): void => {
    const scene = sceneRef.current;
    if (!scene) return;
    const obj = scene.world.get_object(id);
    if (!obj) return;

    if (props.name !== undefined) {
      obj.name = props.name;
    }
    if (props.strId !== undefined && props.strId.trim() !== '') {
      scene.world.rename_str_id(id, props.strId.trim());
    }
    if (props.color !== undefined) {
      obj.set_color(new Float32Array(props.color));
    }
    if ('texturePath' in props) {
      obj.texture_path = props.texturePath ?? null;
    }

    // Refresh inspector snapshot only when name or strId changed — those affect
    // the display header. Color changes don't need a snapshot refresh.
    if (props.name !== undefined || props.strId !== undefined) {
      const inspectorData = scene.editor.inspector() as InspectorData | undefined;
      setEngineSelectedObject(inspectorData);
    }
    triggerVtrAutosave();
  }, [triggerVtrAutosave]);

  /**
   * Load a texture into the engine for `objectId` using a three-level cache:
   *
   * 1. Engine memory  — `scene.has_texture(id)`: already uploaded, re-apply instantly.
   * 2. IndexedDB      — decoded RGBA stored from a previous session.
   * 3. Network        — CDN first (`cdn.vertra.com/cache/{id}.ktx2`),
   *                     then presigned R2 URL as fallback.
   *
   * Decoded pixel data is persisted to IndexedDB on every network fetch so
   * subsequent loads skip the network entirely.
   */
  const applyTextureToEngine = useCallback(async (
    objectId: number,
    textureId: string,
  ): Promise<void> => {
    const scene = sceneRef.current;
    if (!scene) return;

    // ── Level 1: Engine memory ─────────────────────────────────────────────
    // If the texture is already resident in the engine (loaded earlier this
    // session) we only need to point the object at the existing handle.
    if (!scene.has_texture(textureId)) {
      // ── Levels 2 & 3: IndexedDB → CDN → R2 ──────────────────────────────
      let rgba: { width: number; height: number; data: Uint8Array };
      try {
        rgba = await loadTextureRgba(textureId);
      } catch (err) {
        console.error('[Vertra] Failed to load texture:', err);
        return;
      }

      scene.load_texture_from_rgba(textureId, rgba.width, rgba.height, rgba.data);
    }

    // ── Apply to object ────────────────────────────────────────────────────
    const obj = scene.world.get_object(objectId);
    if (obj) {
      obj.texture_path = textureId;
    }

    triggerVtrAutosave();
  }, [triggerVtrAutosave]);

  const spawnGeometry = useCallback((type: GeometryType, name?: string): number | null => {
    const scene = sceneRef.current;
    if (!scene) return null;

    const displayName = name ?? (type.charAt(0).toUpperCase() + type.slice(1));
    const obj = new VertraObject(displayName);

    let geo: Geometry;
    switch (type) {
      case 'cube': geo = Geometry.cube(1); break;
      case 'sphere': geo = Geometry.sphere(0.5, 30); break;
      case 'plane': geo = Geometry.plane(2); break;
      case 'box': geo = Geometry.box(1, 1, 1); break;
      case 'pyramid': geo = Geometry.pyramid(1, 1.5); break;
    }

    obj.set_geometry(geo);
    const id = scene.spawn(obj);
    // Explicitly rebuild React scene (on_scene_graph_modified fires asynchronously
    // from the engine loop, so we also sync here for immediate UI feedback).
    useSceneStore.getState().setScene(buildReactSceneFromWorld(scene));
    triggerVtrAutosave();
    return id;
  }, [triggerVtrAutosave]);

  const deleteEngineObject = useCallback((id: number): void => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.world.delete(id);
    useSceneStore.getState().setScene(buildReactSceneFromWorld(scene));
    triggerVtrAutosave();
  }, [triggerVtrAutosave]);

  const reparentEngineObject = useCallback((id: number, newParentId: number | null): void => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.world.reparent(id, newParentId ?? undefined);
    useSceneStore.getState().setScene(buildReactSceneFromWorld(scene));
    triggerVtrAutosave();
  }, [triggerVtrAutosave]);

  return {
    engineState,
    engineError,
    engineMode,
    engineSelectedObject,
    autosaveState,
    play,
    stop,
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
  };
}

