'use client';

import { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ScriptEditor({ value, onChange }: ScriptEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;

    // Extra type context — injected as a type-hint comment (not real TS, safe)
    ed.updateOptions({
      fontSize: 12,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      padding: { top: 8, bottom: 8 },
      renderLineHighlight: 'gutter',
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Hint bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-vertra-border/40 bg-vertra-surface/40 px-4 py-1.5">
        <span className="text-xs text-vertra-text-dim">
          Globals:
        </span>
        {['VertraObject', 'Geometry', 'Transform', 'Camera'].map((g) => (
          <span
            key={g}
            className="rounded bg-vertra-surface-alt px-1.5 py-0.5 font-mono text-[10px] text-vertra-cyan"
          >
            {g}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-vertra-text-dim">
          Script is saved with the project · Changes take effect on next Play
        </span>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          loading={
            <div className="flex h-full items-center justify-center text-xs text-vertra-text-dim">
              Loading editor…
            </div>
          }
          options={{
            fontSize: 12,
            lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
