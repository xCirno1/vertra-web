'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, GripHorizontal, Code2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import type { EngineVersion } from '@/lib/engine/engineCapabilities';
import { composeScript } from '@/lib/scripts/runtime';

export { composeScript, stripTypeAnnotations } from '@/lib/scripts/runtime';

const ScriptEditor = dynamic(
  () => import('../bottom-panel/ScriptEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-vertra-text-dim">
        Loading editor…
      </div>
    ),
  },
);

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'on_startup' as const, label: 'on_startup', hint: 'Called once when the script is attached.' },
  { key: 'on_update' as const, label: 'on_update', hint: 'Called every frame. dt = delta time in seconds.' },
  { key: 'on_event' as const, label: 'on_event', hint: 'Called for each scene event.' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export interface ScriptTabs {
  on_startup: string;
  on_update: string;
  on_event: string;
}

export const DEFAULT_SCRIPT_TABS: ScriptTabs = {
  on_startup: `function on_startup(id: number, world: World): void {\n  // Called once when the script is attached.\n  // const obj = world.get_object(id);\n}`,
  on_update: `function on_update(id: number, world: World, dt: number): void {\n  // Called every frame. dt = delta time in seconds.\n}`,
  on_event: `function on_event(id: number, world: World, event): void {\n  // Called for each scene event.\n}`,
};

export function getDefaultScriptTabs(): ScriptTabs {
  return DEFAULT_SCRIPT_TABS;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScriptModalProps {
  /** Mode: 'object' = per-object attach/detach flow; 'file' = VFS file editor (Save only). */
  mode?: 'object' | 'file';

  // ── object mode ──
  objectName?: string;
  objectId?: number;
  isAttached?: boolean;
  onAttach?: (composedBody: string) => void;
  onDetach?: () => void;

  // ── file mode ──
  scriptPath?: string;
  onSave?: (tabs: ScriptTabs) => void;

  // ── shared ──
  scriptTabs: ScriptTabs;
  onScriptTabsChange: (tabs: ScriptTabs) => void;
  onClose: () => void;
  engineVersion: EngineVersion;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScriptModal({
  mode = 'object',
  objectName,
  objectId,
  scriptTabs,
  onScriptTabsChange,
  isAttached,
  onAttach,
  onDetach,
  scriptPath,
  onSave,
  onClose,
  engineVersion,
}: ScriptModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('on_startup');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 700, height: 520 });

  // Center on first mount
  useEffect(() => {
    setPos({
      x: Math.max(0, (window.innerWidth - 700) / 2),
      y: Math.max(0, (window.innerHeight - 520) / 2),
    });
  }, []);

  // ── Drag ────────────────────────────────────────────────────────────────
  const dragRef = useRef<{ startX: number; startY: number; startPX: number; startPY: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (!pos) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPX: pos.x, startPY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(0, dragRef.current.startPX + ev.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.startPY + ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  // ── Resize ──────────────────────────────────────────────────────────────
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setSize({
        width: Math.max(420, resizeRef.current.startW + ev.clientX - resizeRef.current.startX),
        height: Math.max(340, resizeRef.current.startH + ev.clientY - resizeRef.current.startY),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  if (!pos) return null;

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  const modal = (
    <div
      className="fixed inset-0 z-200 pointer-events-none"
      aria-modal="true"
      role="dialog"
      aria-label={mode === 'file' ? `Script editor — ${scriptPath ?? 'script'}` : `Script editor — ${objectName ?? 'object'}`}
    >
      <AnimatePresence>
        <motion.div
          key="script-modal"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-auto absolute flex flex-col rounded-xl border border-vertra-border/60 bg-vertra-surface/95 backdrop-blur-md shadow-2xl overflow-visible"
          style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
        >
          {/* ── Title bar / drag handle ──────────────────────────────── */}
          <div
            onMouseDown={onDragStart}
            className="flex items-center gap-2 shrink-0 border-b border-vertra-border/40 bg-vertra-surface/80 px-3 py-2 cursor-grab active:cursor-grabbing select-none"
          >
            <Code2 className="w-3.5 h-3.5 text-vertra-cyan shrink-0" />
            <span className="text-xs font-semibold text-vertra-text truncate flex-1">
              {mode === 'file' ? (scriptPath ?? 'Script') : 'Script'}
            </span>
            {mode === 'object' && objectName !== undefined && objectId !== undefined && (
              <span className="text-[10px] font-mono text-vertra-text-dim mr-2 truncate">
                {objectName} · ID {objectId}
              </span>
            )}
            <GripHorizontal className="w-3.5 h-3.5 text-vertra-text-dim/40 shrink-0" />
            <Button
              variant="icon"
              size="sm"
              onClick={onClose}
              title="Close"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* ── Tab bar ──────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center border-b border-vertra-border/40 bg-vertra-surface/60 px-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActiveTab(tab.key)}
                className={`cursor-pointer px-3 py-2 text-xs font-mono transition-colors border-b-2 -mb-px ${activeTab === tab.key
                    ? 'border-vertra-cyan text-vertra-cyan'
                    : 'border-transparent text-vertra-text-dim hover:text-vertra-text'
                  }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-vertra-text-dim/60 px-2 italic">
              {activeTabMeta.hint}
            </span>
          </div>

          {/* ── Editor area ──────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-visible">
            {/* Render all three editors, show only the active one — preserves Monaco state */}
            {TABS.map((tab) => (
              <div
                key={tab.key}
                className="h-full"
                style={{ display: activeTab === tab.key ? 'block' : 'none' }}
              >
                <ScriptEditor
                  value={scriptTabs[tab.key]}
                  onChange={(v) => onScriptTabsChange({ ...scriptTabs, [tab.key]: v })}
                  engineVersion={engineVersion}
                />
              </div>
            ))}
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between shrink-0 border-t border-vertra-border/40 bg-vertra-surface/60 px-3 py-2">
            {mode === 'file' ? (
              <>
                <span className="text-[10px] text-vertra-text-dim font-mono">{scriptPath}</span>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onSave?.(scriptTabs)}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                {isAttached ? (
                  <span className="text-[10px] text-vertra-cyan/80 font-mono">● Script attached — running</span>
                ) : (
                  <span className="text-[10px] text-vertra-text-dim">
                    Script is not attached to this object.
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {isAttached ? (
                    <Button variant="danger" size="sm" onClick={onDetach}>
                      Detach Script
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => onAttach?.(composeScript(scriptTabs))}
                    >
                      Attach Script
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Resize handle ─────────────────────────────────────────── */}
          <div
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
            title="Drag to resize"
          >
            <svg viewBox="0 0 10 10" className="w-full h-full text-vertra-border/50" fill="none">
              <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return createPortal(modal, document.body);
}
