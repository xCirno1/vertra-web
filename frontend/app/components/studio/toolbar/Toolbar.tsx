'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Move3d,
  RotateCw,
  ZoomOut,
  Save,
  Download,
  ImageIcon,
  UploadCloud,
  Loader2,
  Lightbulb,
  Box,
  Camera,
  Play,
  Square,
  HardDriveDownload,
  FolderOpen,
} from 'lucide-react';
import { EngineState } from '@/hooks/useVertraEngine';
import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { SelectionMode } from '@/types/scene';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onSave: () => Promise<void> | void;
  onExportVertra: () => void;
  onExportPng: () => Promise<void> | void;
  onSyncToCloud?: () => Promise<void> | void;
  onSaveVtr: () => Promise<void> | void;
  onLoadVtr: (file: File) => void;
  canSyncToCloud?: boolean;
  engineState: EngineState;
  onPlayEngine: () => void;
  onStopEngine: () => void;
}

type BusyAction = 'save' | 'vertra' | 'png' | 'sync' | 'save-vtr' | null;

export default function Toolbar({
  onSave,
  onExportVertra,
  onExportPng,
  onSyncToCloud,
  onSaveVtr,
  onLoadVtr,
  canSyncToCloud = false,
  engineState,
  onPlayEngine,
  onStopEngine,
}: ToolbarProps) {
  const { addEntity, currentProject } = useSceneStore();
  const { activeTool, setActiveTool } = useUIStore();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  // Hidden file input for .vtr load
  const vtrInputRef = useRef<HTMLInputElement>(null);

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
    callback: () => Promise<void> | void
  ) => {
    setBusyAction(action);
    try {
      await callback();
    } finally {
      setBusyAction(null);
    }
  };

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
        {(
          [
            { type: 'mesh', label: 'Mesh', Icon: Box, title: 'Add Mesh' },
            { type: 'light', label: 'Light', Icon: Lightbulb, title: 'Add Light' },
            { type: 'camera', label: 'Camera', Icon: Camera, title: 'Add Camera' },
          ] as const
        ).map(({ type, label, Icon, title }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => addEntity(type)}
            title={title}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* ── Play / Stop engine button ── */}
      <div className="mx-1 h-5 w-px bg-vertra-border/40" />
      {engineState === 'running' ? (
        <Button
          variant="danger"
          size="sm"
          onClick={onStopEngine}
          title="Stop Engine"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span>Stop</span>
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

      {/* Project name — center */}
      <div className="flex flex-1 items-center justify-center">
        {currentProject?.name && (
          <span className="max-w-50 truncate text-xs text-vertra-text-dim">
            {currentProject.name}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => runAction('save', onSave)}
          disabled={busyAction !== null}
          title="Save (Ctrl+S)"
        >
          {busyAction === 'save' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => runAction('vertra', async () => onExportVertra())}
          disabled={busyAction !== null}
          title="Export .vertra"
        >
          {busyAction === 'vertra' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>.vertra</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => runAction('png', onExportPng)}
          disabled={busyAction !== null}
          title="Capture PNG"
        >
          {busyAction === 'png' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5" />
          )}
          <span>PNG</span>
        </Button>

        {canSyncToCloud && onSyncToCloud && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => runAction('sync', onSyncToCloud)}
            disabled={busyAction !== null}
            title="Sync local projects to cloud"
          >
            {busyAction === 'sync' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>Sync</span>
          </Button>
        )}

        {/* .vtr save/load — only available while engine is running */}
        <div className="mx-1 h-5 w-px bg-vertra-border/40" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => runAction('save-vtr', onSaveVtr)}
          disabled={busyAction !== null || engineState !== 'running'}
          title={engineState !== 'running' ? 'Start engine first' : 'Save .vtr snapshot'}
        >
          {busyAction === 'save-vtr' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <HardDriveDownload className="w-3.5 h-3.5" />
          )}
          <span>.vtr</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => vtrInputRef.current?.click()}
          disabled={busyAction !== null || engineState !== 'running'}
          title={engineState !== 'running' ? 'Start engine first' : 'Load .vtr snapshot'}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Load .vtr</span>
        </Button>

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
