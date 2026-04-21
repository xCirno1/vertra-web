'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ObjectCreationData } from '@/hooks/useVertraEngine';
import type { GeometryType } from '@/lib/scene/vertra-helpers';

interface ObjectCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateObject: (objectData: ObjectCreationData) => void | Promise<void>;
  isLoading?: boolean;
}

const GEOMETRY_TYPES: { value: GeometryType; label: string }[] = [
  { value: 'cube', label: 'Cube' },
  { value: 'box', label: 'Box' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'pyramid', label: 'Pyramid' },
  { value: 'plane', label: 'Plane' },
];

export default function ObjectCreationDialog({
  isOpen,
  onClose,
  onCreateObject,
  isLoading = false,
}: ObjectCreationDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [objectName, setObjectName] = useState('');
  const [geometryType, setGeometryType] = useState<GeometryType>('cube');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [posX, setPosX] = useState('0');
  const [posY, setPosY] = useState('0');
  const [posZ, setPosZ] = useState('0');
  const [rotX, setRotX] = useState('0');
  const [rotY, setRotY] = useState('0');
  const [rotZ, setRotZ] = useState('0');
  const [scaleX, setScaleX] = useState('1');
  const [scaleY, setScaleY] = useState('1');
  const [scaleZ, setScaleZ] = useState('1');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = useCallback(() => {
    setObjectName('');
    setGeometryType('cube');
    setShowAdvanced(false);
    setPosX('0');
    setPosY('0');
    setPosZ('0');
    setRotX('0');
    setRotY('0');
    setRotZ('0');
    setScaleX('1');
    setScaleY('1');
    setScaleZ('1');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleCreate = useCallback(async () => {
    if (!objectName.trim()) {
      alert('Please enter an object name');
      return;
    }

    const objectData: ObjectCreationData = {
      name: objectName.trim(),
      geometryType,
    };

    if (showAdvanced) {
      objectData.position = [parseFloat(posX) || 0, parseFloat(posY) || 0, parseFloat(posZ) || 0];
      objectData.rotation = [parseFloat(rotX) || 0, parseFloat(rotY) || 0, parseFloat(rotZ) || 0];
      objectData.scale = [parseFloat(scaleX) || 1, parseFloat(scaleY) || 1, parseFloat(scaleZ) || 1];
    }

    try {
      await onCreateObject(objectData);
      handleReset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create object';
      alert(`Error: ${msg}`);
    }
  }, [objectName, geometryType, showAdvanced, posX, posY, posZ, rotX, rotY, rotZ, scaleX, scaleY, scaleZ, onCreateObject, handleReset, onClose]);

  // <-- 3. Return null during SSR
  if (!mounted) return null;

  // <-- 4. Wrap the return in createPortal
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-lg bg-vertra-surface border border-vertra-border/40 shadow-xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-vertra-border/40 px-6 py-4 shrink-0">
              <h2 className="text-lg font-semibold text-vertra-text flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Object to Scene
              </h2>
              <button
                onClick={handleClose}
                className="text-vertra-text-dim hover:text-vertra-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (Made scrollable in case advanced options overflow small screens) */}
            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              {/* Object Name */}
              <div>
                <label className="block text-xs font-medium text-vertra-text-dim mb-2">
                  Object Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., My Cube"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              {/* Geometry Type */}
              <div>
                <label className="block text-xs font-medium text-vertra-text-dim mb-2">
                  Geometry Type
                </label>
                <select
                  value={geometryType}
                  onChange={(e) => setGeometryType(e.target.value as GeometryType)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-vertra-bg border border-vertra-border/40 text-vertra-text text-sm transition-colors hover:border-vertra-border/60 focus:outline-none focus:border-vertra-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {GEOMETRY_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                disabled={isLoading}
                className="text-xs text-vertra-cyan hover:text-vertra-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
              </button>

              {/* Advanced Transform Options */}
              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-vertra-border/40">
                  {/* Position */}
                  <div>
                    <label className="block text-xs font-medium text-vertra-text-dim mb-2">
                      Position (X, Y, Z)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" value={posX} onChange={(e) => setPosX(e.target.value)} disabled={isLoading} step="0.1" />
                      <Input type="number" placeholder="Y" value={posY} onChange={(e) => setPosY(e.target.value)} disabled={isLoading} step="0.1" />
                      <Input type="number" placeholder="Z" value={posZ} onChange={(e) => setPosZ(e.target.value)} disabled={isLoading} step="0.1" />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="block text-xs font-medium text-vertra-text-dim mb-2">
                      Rotation (X, Y, Z) - Degrees
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" value={rotX} onChange={(e) => setRotX(e.target.value)} disabled={isLoading} step="1" />
                      <Input type="number" placeholder="Y" value={rotY} onChange={(e) => setRotY(e.target.value)} disabled={isLoading} step="1" />
                      <Input type="number" placeholder="Z" value={rotZ} onChange={(e) => setRotZ(e.target.value)} disabled={isLoading} step="1" />
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <label className="block text-xs font-medium text-vertra-text-dim mb-2">
                      Scale (X, Y, Z)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="X" value={scaleX} onChange={(e) => setScaleX(e.target.value)} disabled={isLoading} step="0.1" min="0.1" />
                      <Input type="number" placeholder="Y" value={scaleY} onChange={(e) => setScaleY(e.target.value)} disabled={isLoading} step="0.1" min="0.1" />
                      <Input type="number" placeholder="Z" value={scaleZ} onChange={(e) => setScaleZ(e.target.value)} disabled={isLoading} step="0.1" min="0.1" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-vertra-border/40 px-6 py-4 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={handleCreate} disabled={isLoading || !objectName.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Create Object
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}