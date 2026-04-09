'use client';

import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { Box, Copy, Trash2, X } from 'lucide-react';
import { BufferPatch } from '@/hooks/useVertra';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PanelHeader } from '@/components/ui/panel-header';

interface InspectorProps {
  onBufferPatch?: (patch: BufferPatch) => Promise<void> | void;
  engineReady?: boolean;
  engineLoading?: boolean;
}

const AXES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];

const AXIS_COLORS: Record<'x' | 'y' | 'z', string> = {
  x: 'text-red-400',
  y: 'text-green-400',
  z: 'text-blue-400',
};

export default function Inspector({
  onBufferPatch,
  engineReady = false,
  engineLoading = false,
}: InspectorProps) {
  const {
    selectedEntityId,
    getSelectedEntity,
    duplicateEntity,
    removeEntity,
    updatePosition,
    updateRotation,
    updateScale,
  } = useSceneStore();
  const { toggleInspector } = useUIStore();

  const entity = selectedEntityId ? getSelectedEntity() : null;

  const meshComponent = entity?.components.mesh;
  const materialLabel =
    meshComponent && meshComponent.type === 'mesh'
      ? `${meshComponent.material.type} • ${meshComponent.material.color}`
      : 'N/A';
  const verticesLabel = entity?.type === 'mesh' ? '24 (mock cube)' : 'N/A';

  const pushPatch = (patch: BufferPatch) => {
    if (!onBufferPatch) {
      return;
    }

    void Promise.resolve(onBufferPatch(patch));
  };

  const updateAxis = (
    channel: BufferPatch['channel'],
    axis: BufferPatch['axis'],
    rawValue: string
  ) => {
    if (!entity) {
      return;
    }

    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      return;
    }

    if (channel === 'position') {
      updatePosition(entity.id, { [axis]: numericValue });
      pushPatch({ entityId: entity.id, channel, axis, value: numericValue });
      return;
    }

    if (channel === 'rotation') {
      const radians = (numericValue * Math.PI) / 180;
      updateRotation(entity.id, { [axis]: radians });
      pushPatch({ entityId: entity.id, channel, axis, value: radians });
      return;
    }

    updateScale(entity.id, { [axis]: numericValue });
    pushPatch({ entityId: entity.id, channel, axis, value: numericValue });
  };

  if (!entity) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader
          title="Inspector"
          actions={
            <Button variant="icon" size="sm" onClick={toggleInspector} title="Close panel">
              <X className="w-3.5 h-3.5" />
            </Button>
          }
        />
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <Box className="w-8 h-8 text-vertra-border mx-auto mb-2" />
            <p className="text-xs text-vertra-text-dim">
              Select an entity to inspect
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Inspector"
        actions={
          <>
            <Button
              variant="icon"
              onClick={() => duplicateEntity(entity.id)}
              title="Duplicate (Shift+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="danger"
              className="p-1.5 rounded"
              onClick={() => removeEntity(entity.id)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="icon" size="sm" onClick={toggleInspector} title="Close panel">
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        }
      />

      {/* Entity info card */}
      <div className="px-4 pb-3 border-b border-vertra-border/40 shrink-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-vertra-surface-alt/60 rounded-lg px-3 py-2 border border-vertra-border/40"
        >
          <p className="text-xs font-mono font-medium text-vertra-text">
            {entity.name}
          </p>
          <p className="text-xs text-vertra-text-dim mt-1">
            {entity.type} · {entity.visible ? 'Visible' : 'Hidden'}
          </p>
          <p className="mt-1.5 text-[10px] text-vertra-text-dim">
            Engine:{' '}
            <span className={engineReady ? 'text-vertra-success' : 'text-vertra-text-dim'}>
              {engineLoading ? 'Initializing…' : engineReady ? 'Connected' : 'Offline'}
            </span>
          </p>
        </motion.div>
      </div>

      {/* Transform Panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {engineLoading && (
          <div className="space-y-2 rounded-lg border border-vertra-border/40 bg-vertra-surface-alt/50 p-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-vertra-text-dim mb-3 uppercase tracking-widest">
            Transform
          </h3>

          {/* Position */}
          <div className="space-y-2 mb-4">
            <label className="text-xs text-vertra-text">Position</label>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map((axis) => (
                <div key={axis}>
                  <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[axis]}`}>
                    {axis.toUpperCase()}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={entity.transform.position[axis].toFixed(2)}
                    onChange={(event) =>
                      updateAxis('position', axis, event.target.value)
                    }
                    className="w-full mt-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2 mb-4">
            <label className="text-xs text-vertra-text">Rotation</label>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map((axis) => (
                <div key={axis}>
                  <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[axis]}`}>
                    {axis.toUpperCase()}
                  </label>
                  <input
                    type="number"
                    step={1}
                    value={(
                      (entity.transform.rotation[axis] * 180) /
                      Math.PI
                    ).toFixed(1)}
                    onChange={(event) =>
                      updateAxis('rotation', axis, event.target.value)
                    }
                    className="w-full mt-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <label className="text-xs text-vertra-text">Scale</label>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map((axis) => (
                <div key={axis}>
                  <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[axis]}`}>
                    {axis.toUpperCase()}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={entity.transform.scale[axis].toFixed(2)}
                    onChange={(event) =>
                      updateAxis('scale', axis, event.target.value)
                    }
                    className="w-full mt-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-vertra-border/40 bg-linear-to-br from-white/2 to-transparent p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-vertra-text-dim">
            Materials
          </h3>
          <p className="mt-2 text-xs text-vertra-text">{materialLabel}</p>
        </div>

        <div className="rounded-lg border border-vertra-border/40 bg-linear-to-br from-white/2 to-transparent p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-vertra-text-dim">
            Vertices
          </h3>
          <p className="mt-2 text-xs text-vertra-text">{verticesLabel}</p>
        </div>
      </div>
    </div>
  );
}
