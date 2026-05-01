'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ENGINE_VERSIONS,
  ENGINE_VERSION_LABELS,
  type EngineVersion,
} from '@/lib/engine/engineCapabilities';
import {
  getGlobalEngineVersion,
  setGlobalEngineVersion,
} from '@/lib/storage/engine-version-storage';

interface EngineVersionPickerProps {
  projectVersion: EngineVersion | undefined;
  onProjectVersionChange: (v: EngineVersion | undefined) => void;
}

export default function EngineVersionPicker({
  projectVersion,
  onProjectVersionChange,
}: EngineVersionPickerProps) {
  const [open, setOpen] = useState(false);
  const [globalVersion, setGlobalVersionState] = useState<EngineVersion>(getGlobalEngineVersion);
  const [pendingVersion, setPendingVersion] = useState<EngineVersion | null>(null);
  const [pendingIsProjectReset, setPendingIsProjectReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const effectiveVersion = projectVersion ?? globalVersion;

  const requestChange = (version: EngineVersion) => {
    if (version === effectiveVersion) { setOpen(false); return; }
    setPendingVersion(version);
    setPendingIsProjectReset(false);
    setOpen(false);
  };

  const requestProjectReset = () => {
    if (!projectVersion) return;
    setPendingVersion(globalVersion);
    setPendingIsProjectReset(true);
    setOpen(false);
  };

  const confirmChange = () => {
    if (!pendingVersion) return;
    setGlobalEngineVersion(pendingVersion);
    setGlobalVersionState(pendingVersion);
    if (pendingIsProjectReset) {
      onProjectVersionChange(undefined);
    } else {
      onProjectVersionChange(pendingVersion);
    }
    window.location.reload();
  };

  const cancelChange = () => {
    setPendingVersion(null);
    setPendingIsProjectReset(false);
  };

  return (
    <>
      {/* ── Picker button + dropdown ───────────────────────────────── */}
      <div ref={ref} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          title="Engine version"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono text-vertra-text-dim ml-1">
            {effectiveVersion}
          </span>
        </Button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-vertra-border/40 bg-vertra-surface/95 backdrop-blur shadow-xl z-50 p-3 space-y-3"
            >
              <p className="text-[10px] text-vertra-text-dim pb-1">
                Selecting a version will reload the page.
              </p>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-vertra-text-dim mb-1.5">
                  Global Default
                </p>
                <div className="space-y-1">
                  {ENGINE_VERSIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => requestChange(v)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-vertra-text hover:bg-vertra-surface-alt/60 transition-colors"
                    >
                      <span>{ENGINE_VERSION_LABELS[v]}</span>
                      {globalVersion === v && !projectVersion && (
                        <Check className="w-3 h-3 text-vertra-cyan" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-vertra-border/30 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-vertra-text-dim mb-1.5">
                  Project Override
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={requestProjectReset}
                    disabled={!projectVersion}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-vertra-text hover:bg-vertra-surface-alt/60 disabled:opacity-40 transition-colors"
                  >
                    <span className="text-vertra-text-dim italic">Use global default</span>
                    {!projectVersion && <Check className="w-3 h-3 text-vertra-cyan" />}
                  </button>
                  {ENGINE_VERSIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => requestChange(v)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-vertra-text hover:bg-vertra-surface-alt/60 transition-colors"
                    >
                      <span>{ENGINE_VERSION_LABELS[v]}</span>
                      {projectVersion === v && <Check className="w-3 h-3 text-vertra-cyan" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Confirmation modal — portalled to body to escape toolbar transforms ── */}
      {pendingVersion && createPortal(
        <AnimatePresence>
          {pendingVersion && (
            <div className="fixed inset-0 z-60 flex items-center justify-center">
              {/* Backdrop */}
              <motion.div
                key="evp-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={cancelChange}
              />

              {/* Dialog */}
              <motion.div
                key="evp-dialog"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
                className="relative z-10 w-80 rounded-xl border border-vertra-border/60 bg-vertra-surface/95 backdrop-blur shadow-2xl p-5 space-y-4"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="evp-confirm-title"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p id="evp-confirm-title" className="text-sm font-semibold text-vertra-text">
                      Switch to {pendingVersion}?
                    </p>
                    <p className="text-xs text-vertra-text-dim mt-1 leading-relaxed">
                      The page will reload to apply the new engine version.
                      Any unsaved changes may be lost.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancelChange}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={confirmChange}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Reload &amp; Apply
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
