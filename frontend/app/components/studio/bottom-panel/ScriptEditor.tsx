'use client';

import { useEffect, useRef } from 'react';
import Editor, { type OnMount, useMonaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { EngineVersion } from '@/lib/engine/engineCapabilities';

type MonacoApi = Parameters<OnMount>[1];

const ENGINE_MODULE_NAME = 'vertra-engine';
const ENGINE_MODULE_LIB_PATH = 'file:///types/vertra-engine/index.d.ts';
const ENGINE_GLOBALS_LIB_PATH = 'file:///types/vertra-engine/globals.d.ts';

const ENGINE_GLOBAL_TYPES_DTS = `
type Camera = import("${ENGINE_MODULE_NAME}").Camera;
type Transform = import("${ENGINE_MODULE_NAME}").Transform;
type Geometry = import("${ENGINE_MODULE_NAME}").Geometry;
type VertraObject = import("${ENGINE_MODULE_NAME}").VertraObject;
type Scene = import("${ENGINE_MODULE_NAME}").Scene;
type World = import("${ENGINE_MODULE_NAME}").World;
type FrameContext = import("${ENGINE_MODULE_NAME}").FrameContext;
`;

let registeredEngineVersion: EngineVersion | null = null;
let registeredEngineTypeDisposables: Array<{ dispose(): void }> = [];
let pendingEngineTypeRegistration: Promise<void> | null = null;
let pendingEngineTypeVersion: EngineVersion | null = null;

function disposeRegisteredEngineTypes() {
  for (const disposable of registeredEngineTypeDisposables) {
    disposable.dispose();
  }
  registeredEngineTypeDisposables = [];
  registeredEngineVersion = null;
}

function wrapEngineModuleDts(source: string): string {
  const indentedSource = source
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  return `declare module "${ENGINE_MODULE_NAME}" {\n${indentedSource}\n}`;
}

async function ensureEngineTypes(monaco: MonacoApi, version: EngineVersion) {
  if (registeredEngineVersion === version) {
    return;
  }

  if (pendingEngineTypeRegistration && pendingEngineTypeVersion === version) {
    return pendingEngineTypeRegistration;
  }

  pendingEngineTypeVersion = version;
  pendingEngineTypeRegistration = (async () => {
    const response = await fetch(`/engine/${version}/vertra_js.d.ts`);
    if (!response.ok) {
      throw new Error(`Failed to load engine typings for ${version}: HTTP ${response.status}`);
    }

    const engineModuleDts = wrapEngineModuleDts(await response.text());

    if (registeredEngineVersion && registeredEngineVersion !== version) {
      disposeRegisteredEngineTypes();
    }

    if (registeredEngineVersion === version) {
      return;
    }

    registeredEngineTypeDisposables = [
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        engineModuleDts,
        ENGINE_MODULE_LIB_PATH,
      ),
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        ENGINE_GLOBAL_TYPES_DTS,
        ENGINE_GLOBALS_LIB_PATH,
      ),
    ];

    registeredEngineVersion = version;
  })();

  try {
    await pendingEngineTypeRegistration;
  } finally {
    if (pendingEngineTypeVersion === version) {
      pendingEngineTypeRegistration = null;
      pendingEngineTypeVersion = null;
    }
  }
}

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  engineVersion: EngineVersion;
}

export default function ScriptEditor({
  value,
  onChange,
  engineVersion,
}: ScriptEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco() as MonacoApi | null;

  useEffect(() => {
    if (!monaco) {
      return;
    }

    void ensureEngineTypes(monaco, engineVersion).catch((error) => {
      console.error('Failed to register Vertra engine typings in Monaco.', error);
    });
  }, [engineVersion, monaco]);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;

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

    void ensureEngineTypes(monaco, engineVersion).catch((error) => {
      console.error('Failed to register Vertra engine typings in Monaco.', error);
    });
  };

  return (
    <div className="h-full min-h-0">
      <Editor
        height="100%"
        language="typescript"
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
  );
}
