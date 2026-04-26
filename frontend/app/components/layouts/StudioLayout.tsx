'use client';

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';

interface StudioLayoutProps {
  toolbar?: ReactNode;
  leftSidebar: ReactNode;
  centerViewport: ReactNode;
  rightSidebar: ReactNode;
  bottomPanel: ReactNode;
}

export default function StudioLayout({
  toolbar,
  leftSidebar,
  centerViewport,
  rightSidebar,
  bottomPanel,
}: StudioLayoutProps) {
  const {
    sidebarOpen,
    inspectorOpen,
    bottomPanelOpen,
    bottomPanelHeight,
    setBottomPanelHeight,
    sidebarWidth,
    setSidebarWidth,
    inspectorWidth,
    setInspectorWidth,
  } = useUIStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle bottom panel resize
  useEffect(() => {
    if (!isDraggingBottom) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('studio-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setBottomPanelHeight(rect.bottom - e.clientY);
    };

    const handleMouseUp = () => setIsDraggingBottom(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBottom, setBottomPanelHeight]);

  // Handle left sidebar resize
  useEffect(() => {
    if (!isDraggingLeft) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('studio-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setSidebarWidth(e.clientX - rect.left);
    };

    const handleMouseUp = () => setIsDraggingLeft(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, setSidebarWidth]);

  // Handle right inspector resize
  useEffect(() => {
    if (!isDraggingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('studio-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setInspectorWidth(rect.right - e.clientX);
    };

    const handleMouseUp = () => setIsDraggingRight(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRight, setInspectorWidth]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      id="studio-container"
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-vertra-bg"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(29,212,246,0.04),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(142,207,190,0.04),transparent_45%)]" />

      {/* Top Toolbar — full width, always on top */}
      {toolbar && (
        <div className="relative z-20 shrink-0">
          {toolbar}
        </div>
      )}

      {/* Main content row (sidebars + viewport + bottom panel) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative shrink-0 bg-vertra-surface/80 border-r border-vertra-border/40 overflow-hidden flex flex-col"
              style={{ width: sidebarWidth }}
            >
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {leftSidebar}
              </div>
              {/* Right-edge resize handle */}
              <div
                onMouseDown={() => setIsDraggingLeft(true)}
                className="absolute right-0 top-0 h-full w-1 cursor-ew-resize bg-vertra-border/20 hover:bg-vertra-cyan/60 transition-colors"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center + Bottom */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Center Viewport + Right Sidebar */}
          <div className="flex flex-1 overflow-hidden">
            {/* Center Viewport */}
            <div className="flex-1 bg-vertra-surface-alt overflow-hidden flex flex-col">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-hidden"
              >
                {centerViewport}
              </motion.div>
            </div>

            {/* Right Inspector Sidebar */}
            <AnimatePresence mode="wait">
              {inspectorOpen && (
                <motion.div
                  key="inspector"
                  initial={{ x: 320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 320, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative shrink-0 bg-vertra-surface/80 border-l border-vertra-border/40 overflow-hidden flex flex-col"
                  style={{ width: inspectorWidth }}
                >
                  {/* Left-edge resize handle */}
                  <div
                    onMouseDown={() => setIsDraggingRight(true)}
                    className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-vertra-border/20 hover:bg-vertra-cyan/60 transition-colors"
                  />
                  <div className="flex-1 overflow-y-auto">
                    {rightSidebar}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Panel with Resize Handle */}
          <AnimatePresence mode="wait">
            {bottomPanelOpen && (
              <motion.div
                key="bottom-panel"
                initial={{ y: 300, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 300, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 border-t border-vertra-border/40 bg-vertra-surface/80 flex flex-col"
                style={{ height: bottomPanelHeight }}
              >
                {/* Resize Handle */}
                <div
                  onMouseDown={() => setIsDraggingBottom(true)}
                  className="h-1 shrink-0 bg-vertra-border/30 hover:bg-vertra-cyan/60 cursor-ns-resize transition-colors"
                />
                {/* Bottom Panel Content */}
                <div className="flex-1 overflow-hidden">
                  {bottomPanel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
