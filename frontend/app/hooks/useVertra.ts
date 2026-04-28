import { useCallback, useEffect, useRef, useState } from 'react';

export interface BufferPatch {
  entityId: string;
  channel: 'position' | 'rotation' | 'scale';
  axis: 'x' | 'y' | 'z';
  value: number;
}

interface BufferWriteResult {
  offset: number;
  bytesWritten: number;
  writes: number;
}

interface RuntimeState {
  wasmPacket: Uint8Array;
  memory: Uint8Array;
  cursor: number;
  writes: number;
}

/**
 * useVertra Hook
 *
 * Loads a mock Wasm packet from `/api/vertra/module` and exposes an
 * `updateBuffer` bridge method for UI-driven data writes.
 */
export function useVertra() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Booting Vertra runtime...');
  const [writeCount, setWriteCount] = useState(0);
  const [moduleBytes, setModuleBytes] = useState(0);
  const [lastPatch, setLastPatch] = useState<BufferPatch | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const initialize = async () => {
      try {
        setIsLoading(true);
        setStatus('Downloading Vertra wasm packet...');
        setProgress(20);

        const response = await fetch('/api/vertra/module', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Wasm module (${response.status})`);
        }

        const packet = new Uint8Array(await response.arrayBuffer());

        if (!mounted) {
          return;
        }

        setModuleBytes(packet.byteLength);
        setProgress(55);
        setStatus('Initializing batch renderer memory...');

        await new Promise((resolve) => setTimeout(resolve, 600));

        if (!mounted) {
          return;
        }

        runtimeRef.current = {
          wasmPacket: packet,
          memory: new Uint8Array(128 * 1024),
          cursor: 0,
          writes: 0,
        };

        setProgress(100);
        setStatus('Vertra runtime ready');
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (!mounted || controller.signal.aborted) {
          return;
        }

        const resolved =
          err instanceof Error ? err : new Error('Failed to initialize Vertra');
        setError(resolved);
        setStatus('Engine initialization failed');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      controller.abort();
      runtimeRef.current = null;
    };
  }, []);

  const updateBuffer = useCallback(
    async (patch: BufferPatch): Promise<BufferWriteResult> => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        throw new Error('Vertra runtime is not ready yet');
      }

      const payload = new TextEncoder().encode(
        JSON.stringify({ ...patch, timestamp: Date.now() })
      );

      const maxOffset = runtime.memory.length - payload.length - 1;
      if (maxOffset <= 0) {
        throw new Error('Patch payload is larger than runtime buffer');
      }

      const offset = runtime.cursor > maxOffset ? 0 : runtime.cursor;
      runtime.memory.set(payload, offset);
      runtime.cursor = offset + payload.length;
      runtime.writes += 1;

      setWriteCount(runtime.writes);
      setLastPatch(patch);

      await new Promise<void>((resolve) => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }

        window.requestAnimationFrame(() => resolve());
      });

      return {
        offset,
        bytesWritten: payload.length,
        writes: runtime.writes,
      };
    },
    []
  );

  return {
    isReady,
    isLoading,
    error,
    progress,
    status,
    writeCount,
    moduleBytes,
    lastPatch,
    updateBuffer,
    wasmPacketBytes: moduleBytes,
  };
}
