'use client';

import { useCallback, useRef, useState } from 'react';
import init, { VertraObject, Geometry, Transform, Camera } from '../../public/engine/vertra_binder.js';
import type { WebWindow, Scene, FrameContext } from '../../public/engine/vertra_binder.js';

export type EngineState = 'idle' | 'loading' | 'running' | 'error';

interface UseVertraEngineReturn {
  engineState: EngineState;
  engineError: string | null;
  play: (script: string) => Promise<void>;
  stop: () => void;
  saveSceneVtr: () => Promise<Uint8Array>;
  loadSceneVtr: (bytes: Uint8Array) => void;
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

export function useVertraEngine(): UseVertraEngineReturn {
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [engineError, setEngineError] = useState<string | null>(null);

  const engineRef = useRef<WebWindow | null>(null);
  const vtrBridge = useRef<VtrBridge>({ saveCallback: null, loadData: null });

  const play = useCallback(async (script: string) => {
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
        if (onStartup) {
          try {
            onStartup(state, scene);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[Vertra] onStartup error:', msg);
          }
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

  return { engineState, engineError, play, stop, saveSceneVtr, loadSceneVtr };
}

