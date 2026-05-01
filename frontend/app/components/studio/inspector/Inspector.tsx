'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { Box, Code2, Copy, Trash2, X } from 'lucide-react';
import { BufferPatch } from '@/hooks/useVertra';
import type { InspectorData } from '@/hooks/useVertraEngine';
import type { EngineObjectProps } from '@/hooks/useVertraEngine';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PanelHeader } from '@/components/ui/panel-header';
import type { TextureMeta } from '@/types/texture';
import { composeScript, getDefaultScriptTabs, stripTypeAnnotations } from './ScriptModal';
import { getCapabilities } from '@/lib/engine/engineCapabilities';
import { useScriptStore } from '@/stores/scriptStore';
import ScriptBindingPickerModal from './ScriptBindingPickerModal';

const ScriptModal = dynamic(() => import('./ScriptModal'), { ssr: false });

interface InspectorProps {
  onBufferPatch?: (patch: BufferPatch) => Promise<void> | void;
  engineReady?: boolean;
  engineLoading?: boolean;
  engineSelectedObject?: InspectorData;
  /** The texture_path currently set on the selected engine object. Used to pre-populate the picker. */
  engineSelectedTexturePath?: string;
  onEngineTransformChange?: (
    id: number,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => void;
  onEngineObjectPropsChange?: (id: number, props: EngineObjectProps) => void;
  /** List of available textures for the picker. */
  availableTextures?: TextureMeta[];
  /** Called when user applies a texture to the selected object. */
  onApplyTexture?: (objectId: number, textureId: string) => Promise<void>;
  activeEngineVersion?: import('@/lib/engine/engineCapabilities').EngineVersion;
  onAttachScript?: (id: number, scriptBody: string) => void;
  onDetachScript?: (id: number) => void;
}

const AXES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];

const AXIS_COLORS: Record<'x' | 'y' | 'z', string> = {
  x: 'text-red-400',
  y: 'text-green-400',
  z: 'text-blue-400',
};

export default function Inspector({
  onBufferPatch,
  engineLoading = false,
  engineSelectedObject,
  engineSelectedTexturePath,
  onEngineTransformChange,
  onEngineObjectPropsChange,
  availableTextures = [],
  onApplyTexture,
  activeEngineVersion,
  onAttachScript,
  onDetachScript,
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

  // Local editable state for engine-selected object transform
  const [enginePos, setEnginePos] = useState<[number, number, number]>([0, 0, 0]);
  const [engineRot, setEngineRot] = useState<[number, number, number]>([0, 0, 0]);
  const [engineScale, setEngineScale] = useState<[number, number, number]>([1, 1, 1]);
  // Local editable state for object properties
  const [engineName, setEngineName] = useState('');
  const [engineStrId, setEngineStrId] = useState('');
  const [engineColor, setEngineColor] = useState<[number, number, number, number]>([1, 1, 1, 1]);
  const [engineTextureId, setEngineTextureId] = useState<string>('');
  const prevEngineObjIdRef = useRef<number | undefined>(undefined);
  const [attachedScriptPath, setAttachedScriptPath] = useState<string | null>(null);
  const [selectedScriptPath, setSelectedScriptPath] = useState<string | null>(null);
  const [scriptAttached, setScriptAttached] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptPickerOpen, setScriptPickerOpen] = useState(false);
  const { vfs, updateFile, bindScriptToObject, unbindScriptFromObject } = useScriptStore();
  const selectedEngineObjectId = engineSelectedObject?.id;

  // Sync local state when engineSelectedObject changes.
  // Transforms and color always sync (gizmo drags update them externally).
  // Name and str_id only sync when switching to a different object — otherwise
  // committing a rename would immediately revert the input via the snapshot refresh.
  useEffect(() => {
    if (!engineSelectedObject) return;
    setEnginePos([...engineSelectedObject.position] as [number, number, number]);
    setEngineRot([...engineSelectedObject.rotation_deg] as [number, number, number]);
    setEngineScale([...engineSelectedObject.scale] as [number, number, number]);
    setEngineColor([...engineSelectedObject.color] as [number, number, number, number]);
    if (engineSelectedObject.id !== prevEngineObjIdRef.current) {
      prevEngineObjIdRef.current = engineSelectedObject.id;
      setEngineName(engineSelectedObject.name);
      setEngineStrId(engineSelectedObject.str_id);
      setEngineTextureId(engineSelectedTexturePath ?? '');
    }
  }, [engineSelectedObject, engineSelectedTexturePath]);

  useEffect(() => {
    if (selectedEngineObjectId === undefined) {
      setScriptAttached(false);
      setAttachedScriptPath(null);
      setSelectedScriptPath(null);
      setScriptModalOpen(false);
      setScriptPickerOpen(false);
      return;
    }

    const boundScriptPath = vfs.bindings[String(selectedEngineObjectId)] ?? null;
    setScriptAttached(Boolean(boundScriptPath));
    setAttachedScriptPath(boundScriptPath);
    setSelectedScriptPath(boundScriptPath);
    setScriptModalOpen(false);
    setScriptPickerOpen(false);
  }, [selectedEngineObjectId, vfs.bindings]);

  const scriptPaths = Object.keys(vfs.files);
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

  const openScriptPicker = () => {
    if (scriptPaths.length === 0) return;
    setSelectedScriptPath((current) => current ?? attachedScriptPath ?? scriptPaths[0]);
    setScriptPickerOpen(true);
  };

  const handleAttachSelectedScript = () => {
    if (!engineSelectedObject || !selectedScriptPath) return;
    const file = vfs.files[selectedScriptPath];
    if (!file) return;

    bindScriptToObject(engineSelectedObject.id, selectedScriptPath);
    onAttachScript?.(engineSelectedObject.id, stripTypeAnnotations(composeScript(file.tabs)));
    setAttachedScriptPath(selectedScriptPath);
    setScriptAttached(true);
    setScriptPickerOpen(false);
  };

  const handleDetachBoundScript = () => {
    if (!engineSelectedObject) return;
    unbindScriptFromObject(engineSelectedObject.id);
    onDetachScript?.(engineSelectedObject.id);
    setScriptAttached(false);
    setAttachedScriptPath(null);
    setSelectedScriptPath(null);
    setScriptModalOpen(false);
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

  const AXES_IDX: Array<{ label: 'x' | 'y' | 'z'; idx: 0 | 1 | 2 }> = [
    { label: 'x', idx: 0 },
    { label: 'y', idx: 1 },
    { label: 'z', idx: 2 },
  ];

  const commitEngineAxis = (
    channel: 'position' | 'rotation' | 'scale',
    idx: 0 | 1 | 2,
    v: number,
  ) => {
    if (!engineSelectedObject) return;

    const newPos: [number, number, number] = [...enginePos];
    const newRot: [number, number, number] = [...engineRot];
    const newScale: [number, number, number] = [...engineScale];

    if (channel === 'position') {
      newPos[idx] = v;
      setEnginePos(newPos);
    } else if (channel === 'rotation') {
      newRot[idx] = v;
      setEngineRot(newRot);
    } else {
      newScale[idx] = v;
      setEngineScale(newScale);
    }

    onEngineTransformChange?.(engineSelectedObject.id, newPos, newRot, newScale);
  };

  const commitEngineName = () => {
    if (!engineSelectedObject || engineName.trim() === '') return;
    onEngineObjectPropsChange?.(engineSelectedObject.id, { name: engineName.trim() });
  };

  const commitEngineStrId = () => {
    if (!engineSelectedObject || engineStrId.trim() === '') return;
    onEngineObjectPropsChange?.(engineSelectedObject.id, { strId: engineStrId.trim() });
  };

  const commitEngineColorChannel = (idx: 0 | 1 | 2 | 3, v: number) => {
    if (!engineSelectedObject) return;
    const clamped = Math.max(0, Math.min(1, v));
    const newColor: [number, number, number, number] = [...engineColor];
    newColor[idx] = clamped;
    setEngineColor(newColor);
    onEngineObjectPropsChange?.(engineSelectedObject.id, { color: newColor });
  };

  const updateEngineColorFromPicker = (hex: string) => {
    if (!engineSelectedObject) return;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const newColor: [number, number, number, number] = [r, g, b, engineColor[3]];
    setEngineColor(newColor);
    onEngineObjectPropsChange?.(engineSelectedObject.id, { color: newColor });
  };

  const colorToHex = (r: number, g: number, b: number): string => {
    const toHex = (v: number) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // When engine has a selected object, show its data
  if (engineSelectedObject) {
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

        {/* Engine entity info */}
        <div className="px-4 pb-3 border-b border-vertra-border/40 shrink-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-vertra-surface-alt/60 rounded-lg px-3 py-2 border border-vertra-border/40"
          >
            <p className="text-xs font-mono font-medium text-vertra-text">
              {engineName || engineSelectedObject.name}
            </p>
            <p className="text-xs text-vertra-text-dim mt-1">
              {engineSelectedObject.geometry_type ?? 'Object'} · ID {engineSelectedObject.id}
            </p>
          </motion.div>
        </div>

        {/* Transform Panel */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-vertra-text-dim mb-3 uppercase tracking-widest">
              Transform
            </h3>

            {/* Position */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-vertra-text">Position</label>
              <div className="grid grid-cols-3 gap-2">
                {AXES_IDX.map(({ label, idx }) => (
                  <div key={label}>
                    <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[label]}`}>
                      {label.toUpperCase()}
                    </label>
                    <NumericField
                      value={enginePos[idx]}
                      onCommit={(v) => commitEngineAxis('position', idx, v)}
                      className="w-full mt-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-vertra-text">Rotation (deg)</label>
              <div className="grid grid-cols-3 gap-2">
                {AXES_IDX.map(({ label, idx }) => (
                  <div key={label}>
                    <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[label]}`}>
                      {label.toUpperCase()}
                    </label>
                    <NumericField
                      value={engineRot[idx]}
                      onCommit={(v) => commitEngineAxis('rotation', idx, v)}
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
                {AXES_IDX.map(({ label, idx }) => (
                  <div key={label}>
                    <label className={`text-xs font-semibold font-mono ${AXIS_COLORS[label]}`}>
                      {label.toUpperCase()}
                    </label>
                    <NumericField
                      value={engineScale[idx]}
                      onCommit={(v) => commitEngineAxis('scale', idx, v)}
                      className="w-full mt-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-vertra-border/40 bg-linear-to-br from-white/2 to-transparent p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-vertra-text-dim">
              Object Properties
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs text-vertra-text-dim mb-1">Name</label>
              <input
                type="text"
                value={engineName}
                onChange={(e) => setEngineName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { commitEngineName(); (e.target as HTMLInputElement).blur(); } }}
                className="w-full px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors font-mono"
              />
            </div>

            {/* String ID */}
            <div>
              <label className="block text-xs text-vertra-text-dim mb-1">String ID</label>
              <input
                type="text"
                value={engineStrId}
                onChange={(e) => setEngineStrId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { commitEngineStrId(); (e.target as HTMLInputElement).blur(); } }}
                className="w-full px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors font-mono"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs text-vertra-text-dim mb-1">Color (RGBA)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorToHex(engineColor[0], engineColor[1], engineColor[2])}
                  onChange={(e) => updateEngineColorFromPicker(e.target.value)}
                  className="w-8 h-7 rounded cursor-pointer border border-vertra-border/40 bg-transparent"
                  title="Pick RGB color"
                />
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {(['R', 'G', 'B', 'A'] as const).map((ch, idx) => (
                    <div key={ch}>
                      <label className="text-[10px] font-mono text-vertra-text-dim">{ch}</label>
                      <NumericField
                        value={engineColor[idx as 0 | 1 | 2 | 3]}
                        onCommit={(v) => commitEngineColorChannel(idx as 0 | 1 | 2 | 3, v)}
                        className="w-full mt-0.5 px-1 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Texture */}
            {availableTextures.length > 0 && (
              <div>
                <label className="block text-xs text-vertra-text-dim mb-1">Texture</label>
                <div className="flex items-center gap-2">
                  <select
                    value={engineTextureId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEngineTextureId(id);
                      if (id && onApplyTexture) {
                        void onApplyTexture(engineSelectedObject.id, id);
                      } else if (!id) {
                        onEngineObjectPropsChange?.(engineSelectedObject.id, { texturePath: null });
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-vertra-surface-alt/60 border border-vertra-border/40 rounded text-vertra-text focus:border-vertra-cyan/60 outline-none transition-colors"
                  >
                    <option value="">None</option>
                    {availableTextures.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.width && t.height ? ` (${t.width}\u00d7${t.height})` : ''}
                      </option>
                    ))}
                  </select>
                  {engineTextureId && (
                    <Button
                      variant="icon"
                      size="sm"
                      title="Remove texture"
                      onClick={() => {
                        setEngineTextureId('');
                        onEngineObjectPropsChange?.(engineSelectedObject.id, { texturePath: null });
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Read-only info */}
            <div className="pt-1 border-t border-vertra-border/30 space-y-1 text-xs text-vertra-text-dim">
              <p>
                Integer ID: <span className="text-vertra-text font-mono">{engineSelectedObject.id}</span>
              </p>
              {engineSelectedObject.geometry_type && (
                <p>
                  Geometry: <span className="text-vertra-text font-mono">{engineSelectedObject.geometry_type}</span>
                </p>
              )}
            </div>
          </div>

          {(activeEngineVersion ? getCapabilities(activeEngineVersion).perObjectScripting : false) && (
            <div className="rounded-lg border border-vertra-border/40 bg-linear-to-br from-white/2 to-transparent p-3 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-vertra-text-dim flex-1">
                  Script
                </h3>
                {scriptAttached && (
                  <span className="text-[10px] text-vertra-cyan/80 font-mono">● attached</span>
                )}
              </div>

              {scriptAttached && attachedScriptPath ? (
                /* Attached state: show path + Edit / Detach */
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 text-[11px] font-mono text-vertra-text truncate" title={attachedScriptPath}>
                    {attachedScriptPath}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openScriptPicker}
                    title="Change bound script"
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScriptModalOpen(true)}
                    title="Open script editor"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDetachBoundScript}
                  >
                    Detach
                  </Button>
                </div>
              ) : (
                /* Unattached state: show tree picker launcher */
                <div className="flex items-center gap-2">
                  {scriptPaths.length === 0 ? (
                    <span className="flex-1 text-[11px] text-vertra-text-dim italic">
                      No scripts — create one in the Scripts panel
                    </span>
                  ) : (
                    <>
                      <span className="flex-1 text-[11px] text-vertra-text-dim">
                        Choose a script file to bind to this object.
                      </span>
                      <Button variant="accent" size="sm" onClick={openScriptPicker}>
                        Pick Script…
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {(activeEngineVersion ? getCapabilities(activeEngineVersion).perObjectScripting : false) && scriptPickerOpen && (
            <ScriptBindingPickerModal
              scriptPaths={scriptPaths}
              selectedPath={selectedScriptPath}
              onSelect={setSelectedScriptPath}
              onClose={() => setScriptPickerOpen(false)}
              onConfirm={handleAttachSelectedScript}
            />
          )}

          {/* Script modal — rendered at root level via portal */}
          {(activeEngineVersion ? getCapabilities(activeEngineVersion).perObjectScripting : false) && scriptModalOpen && attachedScriptPath && (
            <ScriptModal
              mode="object"
              objectName={engineName || engineSelectedObject.name}
              objectId={engineSelectedObject.id}
              scriptPath={attachedScriptPath}
              scriptTabs={vfs.files[attachedScriptPath]?.tabs ?? getDefaultScriptTabs()}
              onScriptTabsChange={(tabs) => updateFile(attachedScriptPath, { tabs })}
              isAttached={scriptAttached}
              onAttach={(composedBody) => {
                bindScriptToObject(engineSelectedObject.id, attachedScriptPath);
                onAttachScript?.(engineSelectedObject.id, stripTypeAnnotations(composedBody));
                setScriptAttached(true);
              }}
              onDetach={handleDetachBoundScript}
              onClose={() => setScriptModalOpen(false)}
              engineVersion={activeEngineVersion!}
            />
          )}
        </div>
      </div>
    );
  }

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
                  <NumericField
                    value={entity.transform.position[axis]}
                    onCommit={(v) => updateAxis('position', axis, String(v))}
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
                  <NumericField
                    value={(entity.transform.rotation[axis] * 180) / Math.PI}
                    onCommit={(v) => updateAxis('rotation', axis, String(v))}
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
                  <NumericField
                    value={entity.transform.scale[axis]}
                    onCommit={(v) => updateAxis('scale', axis, String(v))}
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

// ─── NumericField ─────────────────────────────────────────────────────────────
// Uncontrolled-style input: shows the external value only when not focused,
// and applies the new value only on Enter or blur.

interface NumericFieldProps {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
}

function NumericField({ value, onCommit, className }: NumericFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const isFocused = draft !== null;

  const commit = (raw: string) => {
    const v = Number(raw);
    if (!Number.isNaN(v)) onCommit(v);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? draft! : String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setDraft(String(value))}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit((e.target as HTMLInputElement).value);
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}
