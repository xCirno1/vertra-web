'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import init, { VertraObject, Geometry, Transform, Camera } from '../../public/engine/vertra_binder.js';
import type { WebWindow, Scene, FrameContext, InspectorData, EditorEventPayload } from '../../public/engine/vertra_binder.js';

export type EngineState = 'idle' | 'loading' | 'running' | 'error';
export type GeometryType = 'cube' | 'sphere' | 'plane' | 'box' | 'pyramid';
export type AutosaveState = 'idle' | 'saving' | 'saved';
export type { InspectorData, EditorEventPayload };

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
  spawnGeometry: (type: GeometryType, name?: string) => number | null;
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
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(
    'VertraObject',
    'Geometry',
    'Transform',
    'Camera',
    scriptBody,
  );
  return factory(VertraObject, Geometry, Transform, Camera) as UserScriptHandlers;
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
    }, 5000);
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
  }, [engineState]);

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
    triggerVtrAutosave();
    return id;
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
    spawnGeometry,
  };
}

