'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Move3d,
  RotateCw,
  ZoomOut,
  Save,
  ImageIcon,
  UploadCloud,
  Loader2,
  Lightbulb,
  Box,
  Camera,
  Play,
  HardDriveDownload,
  FolderOpen,
  Pencil,
  ChevronDown,
  Circle,
  Square,
  Triangle,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Eye,
  Check,
  Cloud,
} from 'lucide-react';
import { AutosaveState, EngineState, GeometryType } from '@/hooks/useVertraEngine';
import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { SelectionMode } from '@/types/scene';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onSave: () => Promise<void> | void;
  onExportPng: () => Promise<void> | void;
  onSyncToCloud?: () => Promise<void> | void;
  onSaveVtr: () => Promise<void> | void;
  onLoadVtr: (file: File) => void;
  canSyncToCloud?: boolean;
  engineState: EngineState;
  engineMode?: 'editor' | 'play' | null;
  onPlayEngine: () => void;
  onToggleEditorMode?: () => void;
  onSpawnGeometry?: (type: GeometryType) => void;
  autosaveState?: AutosaveState;
  autosaveEnabled?: boolean;
  onToggleAutosave?: () => void;
}

type BusyAction = 'save' | 'png' | 'sync' | 'save-vtr' | null;

const GEOMETRY_OPTIONS: Array<{ type: GeometryType; label: string; icon: React.ReactNode }> = [
  { type: 'cube', label: 'Cube', icon: <Box className="w-3.5 h-3.5" /> },
  { type: 'sphere', label: 'Sphere', icon: <Circle className="w-3.5 h-3.5" /> },
  { type: 'plane', label: 'Plane', icon: <Square className="w-3.5 h-3.5" /> },
  { type: 'box', label: 'Box', icon: <Box className="w-3.5 h-3.5" /> },
  { type: 'pyramid', label: 'Pyramid', icon: <Triangle className="w-3.5 h-3.5" /> },
];

export default function Toolbar({
  onSave,
  onExportPng,
  onSyncToCloud,
  onSaveVtr,
  onLoadVtr,
  canSyncToCloud = false,
  engineState,
  engineMode,
  onPlayEngine,
  onToggleEditorMode,
  onSpawnGeometry,
  autosaveState = 'idle',
  autosaveEnabled = true,
  onToggleAutosave,
}: ToolbarProps) {
  const { addEntity, currentProject, setCurrentProject } = useSceneStore();
  const {
    activeTool,
    setActiveTool,
    sidebarOpen,
    toggleSidebar,
    inspectorOpen,
    toggleInspector,
    bottomPanelOpen,
    toggleBottomPanel,
  } = useUIStore();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [geoMenuOpen, setGeoMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const geoMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const vtrInputRef = useRef<HTMLInputElement>(null);

  // Close file dropdown on outside click
  useEffect(() => {
    if (!fileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fileMenuOpen]);

  // Close geometry dropdown on outside click
  useEffect(() => {
    if (!geoMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (geoMenuRef.current && !geoMenuRef.current.contains(e.target as Node)) {
        setGeoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [geoMenuOpen]);

  // Close view dropdown on outside click
  useEffect(() => {
    if (!viewMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [viewMenuOpen]);

  // Focus rename input when it appears
  useEffect(() => {
    if (isRenamingProject) {
      renameInputRef.current?.select();
    }
  }, [isRenamingProject]);

  const startRename = () => {
    if (!currentProject) return;
    setRenameValue(currentProject.name);
    setIsRenamingProject(true);
  };

  const commitRename = () => {
    if (currentProject && renameValue.trim()) {
      setCurrentProject({ ...currentProject, name: renameValue.trim() });
    }
    setIsRenamingProject(false);
  };

  const cancelRename = () => {
    setIsRenamingProject(false);
  };

  const tools: Array<{
    id: Exclude<SelectionMode, 'none'>;
    label: string;
    icon: typeof Move3d;
    shortcut: string;
  }> = [
      { id: 'translate', label: 'Translate', icon: Move3d, shortcut: 'G' },
      { id: 'rotate', label: 'Rotate', icon: RotateCw, shortcut: 'R' },
      { id: 'scale', label: 'Scale', icon: ZoomOut, shortcut: 'S' },
    ];

  const runAction = async (
    action: BusyAction,
    callback: () => Promise<void> | void,
  ) => {
    setFileMenuOpen(false);
    setBusyAction(action);
    try {
      await callback();
    } finally {
      setBusyAction(null);
    }
  };

  const engineRunning = engineState === 'running';

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-1 h-12 px-3 border-b border-vertra-border/40 bg-vertra-surface/50 backdrop-blur z-10"
    >
      {/* Transform tools */}
      <div className="flex gap-0.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              active={isActive}
              onClick={() => setActiveTool(isActive ? 'none' : tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tool.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="mx-1 h-5 w-px bg-vertra-border/40" />

      {/* Add entity buttons */}
      <div className="flex gap-0.5">
        {/* Geometry dropdown */}
        <div ref={geoMenuRef} className="relative">
          <Button
            variant="ghost"
            size="sm"
            active={geoMenuOpen}
            onClick={() => setGeoMenuOpen((v) => !v)}
            title="Add Geometry"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Mesh</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>

          <AnimatePresence>
            {geoMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-vertra-border/40 bg-vertra-surface/95 backdrop-blur shadow-xl z-50 py-1"
              >
                {GEOMETRY_OPTIONS.map(({ type, label, icon }) => (
                  <DropdownItem
                    key={type}
                    icon={icon}
                    label={label}
                    disabled={!engineRunning}
                    disabledHint="Start engine first"
                    onClick={() => {
                      setGeoMenuOpen(false);
                      onSpawnGeometry?.(type);
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => addEntity('light')}
          title="Add Light"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Light</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addEntity('camera')}
          title="Add Camera"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera</span>
        </Button>
      </div>

      <div className="mx-1 h-5 w-px bg-vertra-border/40" />

      {/* Play / Edit mode toggle */}
      {engineRunning ? (
        <Button
          variant="ghost"
          size="sm"
          active={engineMode === 'play'}
          onClick={onToggleEditorMode}
          title={engineMode === 'editor' ? 'Switch to Play mode' : 'Switch to Editor mode'}
        >
          {engineMode === 'editor' ? (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play</span>
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="accent"
          size="sm"
          onClick={onPlayEngine}
          disabled={engineState === 'loading'}
          title="Run Vertra Engine"
        >
          {engineState === 'loading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          <span>{engineState === 'loading' ? 'Starting…' : 'Play'}</span>
        </Button>
      )}

      {/* Project name + autosave indicator — center */}
      <div className="flex flex-1 items-center justify-center gap-2">
        {currentProject && (
          isRenamingProject ? (
            <div className="flex items-center gap-1">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') cancelRename();
                }}
                className="max-w-48 rounded bg-vertra-surface border border-vertra-cyan/50 px-2 py-0.5 text-xs text-vertra-text outline-none focus:ring-1 focus:ring-vertra-cyan/60"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); commitRename(); }}
                className="text-vertra-cyan hover:text-vertra-cyan/80"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={startRename}
              title="Click to rename project"
              className="max-w-50 truncate text-xs text-vertra-text-dim hover:text-vertra-text transition-colors cursor-text px-1 rounded hover:bg-vertra-surface/60"
            >
              {currentProject.name}
            </button>
          )
        )}
        {/* Autosave status pill */}
        <AnimatePresence mode="wait">
          {autosaveState === 'saving' && (
            <motion.span
              key="saving"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 text-[10px] text-vertra-text-dim"
            >
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Saving...
            </motion.span>
          )}
          {autosaveState === 'saved' && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 text-[10px] text-vertra-cyan/70"
            >
              <Cloud className="w-2.5 h-2.5" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* View dropdown */}
      <div ref={viewMenuRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          active={viewMenuOpen}
          onClick={() => setViewMenuOpen((v) => !v)}
          title="View options"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>

        <AnimatePresence>
          {viewMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-vertra-border/40 bg-vertra-surface/95 backdrop-blur shadow-xl z-50 py-1"
            >
              <DropdownToggleItem
                icon={<PanelLeft className="w-3.5 h-3.5" />}
                label="Left Panel"
                checked={sidebarOpen}
                onClick={toggleSidebar}
              />
              <DropdownToggleItem
                icon={<PanelBottom className="w-3.5 h-3.5" />}
                label="Bottom Panel"
                checked={bottomPanelOpen}
                onClick={toggleBottomPanel}
              />
              <DropdownToggleItem
                icon={<PanelRight className="w-3.5 h-3.5" />}
                label="Right Panel"
                checked={inspectorOpen}
                onClick={toggleInspector}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-1 h-5 w-px bg-vertra-border/40" />

      {/* File dropdown */}
      <div ref={fileMenuRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFileMenuOpen((v) => !v)}
          disabled={busyAction !== null}
          active={fileMenuOpen}
          title="File actions"
        >
          {busyAction !== null ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>File</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>

        <AnimatePresence>
          {fileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-vertra-border/40 bg-vertra-surface/95 backdrop-blur shadow-xl z-50 py-1"
            >
              {/* Save */}
              <DropdownItem
                icon={<Save className="w-3.5 h-3.5" />}
                label="Save"
                hint="Ctrl+S"
                onClick={() => runAction('save', onSave)}
              />

              {/* Export PNG */}
              <DropdownItem
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                label="Export PNG"
                onClick={() => runAction('png', onExportPng)}
              />

              {/* Sync to Cloud */}
              {canSyncToCloud && onSyncToCloud && (
                <>
                  <DropdownDivider />
                  <DropdownItem
                    icon={<UploadCloud className="w-3.5 h-3.5" />}
                    label="Sync to Cloud"
                    onClick={() => runAction('sync', onSyncToCloud)}
                  />
                </>
              )}

              <DropdownDivider />

              {/* Save .vtr */}
              <DropdownItem
                icon={<HardDriveDownload className="w-3.5 h-3.5" />}
                label="Save Snapshot (.vtr)"
                disabled={!engineRunning}
                disabledHint="Start engine first"
                onClick={() => runAction('save-vtr', onSaveVtr)}
              />

              {/* Load .vtr */}
              <DropdownItem
                icon={<FolderOpen className="w-3.5 h-3.5" />}
                label="Load Snapshot (.vtr)"
                disabled={!engineRunning}
                disabledHint="Start engine first"
                onClick={() => {
                  setFileMenuOpen(false);
                  vtrInputRef.current?.click();
                }}
              />

              {onToggleAutosave && (
                <>
                  <DropdownDivider />
                  <DropdownToggleItem
                    icon={<Cloud className="w-3.5 h-3.5" />}
                    label="Enable Autosave"
                    checked={autosaveEnabled}
                    onClick={() => { setFileMenuOpen(false); onToggleAutosave(); }}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input for .vtr loading */}
        <input
          ref={vtrInputRef}
          type="file"
          accept=".vtr"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadVtr(file);
            e.target.value = '';
          }}
        />
      </div>
    </motion.div>
  );
}

// ─── Dropdown primitives ──────────────────────────────────────────────────────

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  disabledHint?: string;
  onClick: () => void;
}

function DropdownItem({ icon, label, hint, disabled, disabledHint, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled && disabledHint ? disabledHint : undefined}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs text-vertra-text hover:bg-vertra-surface-alt/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <span className="text-vertra-text-dim">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {hint && <span className="text-vertra-text-dim/60">{hint}</span>}
    </button>
  );
}

function DropdownDivider() {
  return <div className="my-1 h-px bg-vertra-border/30" />;
}

interface DropdownToggleItemProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onClick: () => void;
}

function DropdownToggleItem({ icon, label, checked, onClick }: DropdownToggleItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs text-vertra-text hover:bg-vertra-surface-alt/60 transition-colors"
    >
      <span className="text-vertra-text-dim">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={checked ? 'text-vertra-cyan' : 'text-vertra-text-dim/30'}>
        <Check className="w-3 h-3" />
      </span>
    </button>
  );
}
