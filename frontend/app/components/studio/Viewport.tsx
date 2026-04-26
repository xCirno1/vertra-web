'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Eye, Loader2 } from 'lucide-react';
import { useCanvasResize } from '@/hooks/useCanvasResize';
import { Skeleton } from '@/components/ui/skeleton';
import { EngineState, type EditorEventPayload } from '@/hooks/useVertraEngine';

export interface ViewportHandle {
  captureScreenshot: () => Promise<Blob | null>;
}

interface ViewportProps {
  isEngineReady: boolean;
  isEngineLoading: boolean;
  entityCount: number;
  engineState: EngineState;
  engineError: string | null;
  isEditorMode?: boolean;
  sendEditorEvent?: (payload: EditorEventPayload) => void;
  /** Called when a texture is dragged from the library and dropped onto the viewport */
  onTextureDrop?: (textureId: string) => void;
}

const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport(
  { isEngineReady, isEngineLoading, entityCount, engineState, engineError, isEditorMode, sendEditorEvent, onTextureDrop },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useCanvasResize(containerRef as React.RefObject<HTMLDivElement>);

  const cameraConfig = useMemo(
    () => ({ position: [4, 3, 6] as [number, number, number], fov: 52 }),
    []
  );

  useImperativeHandle(ref, () => ({
    captureScreenshot: async () => {
      if (!canvasRef.current) return null;
      return new Promise((resolve) => {
        canvasRef.current?.toBlob((blob) => resolve(blob || null), 'image/png', 1);
      });
    },
  }));

  // Forward mouse/keyboard events to the Vertra editor subsystem when in editor mode
  useEffect(() => {
    if (!isEditorMode || !sendEditorEvent) return;

    const canvas = document.getElementById('vertra-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      sendEditorEvent({ type: 'mouse_motion', dx: e.movementX, dy: e.movementY });
      const rect = canvas.getBoundingClientRect();
      sendEditorEvent({ type: 'cursor_moved', x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onMouseDown = (e: MouseEvent) => {
      sendEditorEvent({
        type: 'mouse_button',
        left: e.button === 0 ? true : undefined,
        middle: e.button === 1 ? true : undefined,
        right: e.button === 2 ? true : undefined,
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      sendEditorEvent({
        type: 'mouse_button',
        left: e.button === 0 ? false : undefined,
        middle: e.button === 1 ? false : undefined,
        right: e.button === 2 ? false : undefined,
      });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sendEditorEvent({ type: 'scroll', delta: -e.deltaY * 0.01 });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      sendEditorEvent({ type: 'modifiers', alt: e.altKey, ctrl: e.ctrlKey });
      sendEditorEvent({ type: 'key_pressed', code: e.code });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as Element;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      sendEditorEvent({ type: 'modifiers', alt: e.altKey, ctrl: e.ctrlKey });
      sendEditorEvent({ type: 'key_released', code: e.code });
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isEditorMode, sendEditorEvent]);

  const isRunning = engineState === 'running';
  const isEngineLoading2 = engineState === 'loading';

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-linear-to-br from-vertra-bg via-vertra-surface-alt to-vertra-bg"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('texture-id')) e.preventDefault();
      }}
      onDrop={(e) => {
        const textureId = e.dataTransfer.getData('texture-id');
        if (textureId && onTextureDrop) {
          e.preventDefault();
          onTextureDrop(textureId);
        }
      }}
    >
      {/* ── R3F edit-mode canvas (hidden while engine is running) ── */}
      <div
        className="absolute inset-0"
        style={{ visibility: isRunning || isEngineLoading2 ? 'hidden' : 'visible' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <Canvas
            dpr={[1, Math.min(size.dpr, 2)]}
            camera={cameraConfig}
            onCreated={({ gl }) => {
              canvasRef.current = gl.domElement;
            }}
          >
            <color attach="background" args={['#090a0d']} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[4, 8, 3]} intensity={1.2} />
            <mesh rotation={[0.3, 0.4, 0]}>
              <boxGeometry args={[1.8, 1.8, 1.8]} />
              <meshNormalMaterial />
            </mesh>
            <gridHelper args={[20, 20, '#2a2a3e', '#1a1a24']} />
          </Canvas>
        </motion.div>
      </div>

      {/* ── Vertra engine canvas — always in the DOM so engine.start() can find it ── */}
      <canvas
        id="vertra-canvas"
        className="absolute inset-0 h-full w-full"
        style={{ display: isRunning ? 'block' : 'none' }}
      />

      {/* ── Engine loading overlay ── */}
      <AnimatePresence>
        {isEngineLoading2 && (
          <motion.div
            key="engine-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-vertra-bg/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-vertra-border bg-vertra-surface p-6">
              <Loader2 className="h-8 w-8 animate-spin text-vertra-cyan" />
              <p className="text-sm text-vertra-text">Starting Vertra Engine…</p>
              <p className="text-xs text-vertra-text-dim">Compiling WASM module</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Engine error overlay ── */}
      <AnimatePresence>
        {engineState === 'error' && engineError && (
          <motion.div
            key="engine-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-16 z-20 rounded-lg border border-vertra-error/30 bg-vertra-error/10 px-4 py-3"
          >
            <p className="text-xs font-medium text-vertra-error">Engine error</p>
            <p className="mt-0.5 text-xs text-vertra-error/80">{engineError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wasm bridge loading overlay (legacy useVertra) ── */}
      {isEngineLoading && !isRunning && !isEngineLoading2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-vertra-bg/65 backdrop-blur-sm"
        >
          <div className="w-70 rounded-lg border border-vertra-border bg-vertra-surface p-4">
            <p className="mb-3 text-sm text-vertra-text">Initializing Vertra Engine...</p>
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="mt-2 h-2.5 w-5/6" />
          </div>
        </motion.div>
      )}

      {!isEngineReady && !isEngineLoading && !isRunning && !isEngineLoading2 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-center">
          <div className="rounded-lg border border-vertra-border bg-vertra-surface/80 p-6">
            <Eye className="mx-auto mb-3 h-9 w-9 text-vertra-cyan" />
            <p className="text-sm text-vertra-text">Engine unavailable</p>
            <p className="mt-1 text-xs text-vertra-text-dim">
              Preview is paused until the Wasm bridge is ready.
            </p>
          </div>
        </div>
      )}

      {/* ── Floating stats bar ── */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded border border-vertra-border bg-vertra-surface/80 px-3 py-2 text-xs text-vertra-text-dim backdrop-blur">
        {isRunning && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-vertra-success" />
            <span className="text-vertra-success">LIVE</span>
            <span className="mx-1 text-vertra-border">·</span>
          </span>
        )}
        FPS: 60 · Entities: {entityCount} · {Math.round(size.width)}×
        {Math.round(size.height)} · AR {size.aspectRatio.toFixed(2)}
      </div>
    </div>
  );
});

export default Viewport;

