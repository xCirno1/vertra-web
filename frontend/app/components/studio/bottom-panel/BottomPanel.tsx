'use client';

import { motion } from 'framer-motion';
import { FileText, Terminal, Search, X, Code2, PackageOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import dynamic from 'next/dynamic';

const ScriptEditor = dynamic(
  () => import('./ScriptEditor'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-xs text-vertra-text-dim">Loading editor…</div> },
);

interface BottomPanelProps {
  logs: string[];
  isLoadingAssets?: boolean;
  script: string;
  onScriptChange: (v: string) => void;
}

const ASSET_PLACEHOLDERS = [
  'SceneMaterials.vertra-mat',
  'SunRig.lightset',
  'BatchRenderProfile.profile',
];

export default function BottomPanel({
  logs,
  isLoadingAssets = false,
  script,
  onScriptChange,
}: BottomPanelProps) {
  const latestLogs = logs.slice(-30).reverse();
  const { toggleBottomPanel } = useUIStore();

  const resolveLogClassName = (line: string) => {
    if (line.includes('[SUCCESS]')) {
      return 'text-vertra-success';
    }

    if (line.includes('[ERROR]')) {
      return 'text-vertra-error';
    }

    if (line.includes('[WARN]')) {
      return 'text-yellow-300';
    }

    return 'text-vertra-text-dim';
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="assets" className="flex h-full flex-col">
        {/* Tab bar */}
        <div className="flex items-center gap-3 border-b border-vertra-border/40 bg-vertra-surface/40 px-4 py-2">
          <TabsList className="h-auto bg-transparent p-0">
            <TabsTrigger value="assets" className="gap-2 text-xs">
              <FileText className="h-4 w-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="console" className="gap-2 text-xs">
              <Terminal className="h-4 w-4" />
              Console
            </TabsTrigger>
            <TabsTrigger value="script" className="gap-2 text-xs">
              <Code2 className="h-4 w-4" />
              Script
            </TabsTrigger>
          </TabsList>

          <div className="flex-1" />

          <Input
            type="text"
            placeholder="Search assets..."
            leadingIcon={<Search className="h-3 w-3" />}
            containerClassName="gap-2 rounded border border-vertra-border/40 bg-vertra-surface-alt/50 px-2 py-1 focus-within:border-vertra-cyan/60"
            className="w-24 text-xs"
          />

          <Button variant="icon" size="sm" onClick={toggleBottomPanel} title="Close panel">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="assets" className="mt-0 h-full overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-vertra-text-dim">
                <PackageOpen className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Asset Browser</p>
              </div>

              {isLoadingAssets ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-10/12" />
                </div>
              ) : (
                <div className="space-y-2">
                  {ASSET_PLACEHOLDERS.map((asset) => (
                    <div
                      key={asset}
                      className="rounded-lg border border-vertra-border/30 bg-linear-to-br from-white/2 to-transparent px-3 py-2 text-xs text-vertra-text"
                    >
                      {asset}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="console" className="mt-0 h-full overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1 font-mono text-xs"
            >
              {latestLogs.length === 0 ? (
                <p className="text-vertra-text-dim">[INFO] Console ready.</p>
              ) : (
                latestLogs.map((line, index) => (
                  <div key={`${line}-${index}`} className={resolveLogClassName(line)}>
                    {line}
                  </div>
                ))
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="script" className="mt-0 h-full overflow-hidden">
            <ScriptEditor value={script} onChange={onScriptChange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
