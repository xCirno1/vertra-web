import { useEffect, useState } from 'react';

interface CanvasSize {
  width: number;
  height: number;
  aspectRatio: number;
  dpr: number;
}

/**
 * useCanvasResize Hook
 * 
 * Handles dynamic canvas resizing while maintaining aspect ratio.
 * Accounts for device pixel ratio for Retina displays.
 */
export function useCanvasResize(
  containerRef: React.RefObject<HTMLDivElement>
): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({
    width: 960,
    height: 540,
    aspectRatio: 16 / 9,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      const dpr = window.devicePixelRatio || 1;

      setSize({
        width,
        height,
        aspectRatio: width / height,
        dpr,
      });
    };

    // Initial size
    updateSize();

    // Create ResizeObserver for responsive resizing
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef]);

  return size;
}
