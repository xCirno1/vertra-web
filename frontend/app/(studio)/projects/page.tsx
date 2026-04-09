'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Layers, UploadCloud, Loader2, Cloud, HardDrive, Search } from 'lucide-react';
import {
  createProjectDraft,
  loadProjects,
  saveProject,
  syncLocalProjectsToCloud,
  type EngineProject,
  type ProjectSource,
} from '@/lib/storage/project-storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const THUMBNAIL_GRADIENTS = [
  'from-cyan-950 via-cyan-900/30',
  'from-indigo-950 via-indigo-900/30',
  'from-teal-950 via-teal-900/30',
  'from-violet-950 via-violet-900/30',
  'from-blue-950 via-blue-900/30',
  'from-emerald-950 via-emerald-900/30',
];

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<EngineProject[]>([]);
  const [source, setSource] = useState<ProjectSource>('local');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [canSyncToCloud, setCanSyncToCloud] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      const result = await loadProjects();
      if (!mounted) return;
      setProjects(result.projects);
      setSource(result.source);
      setCanSyncToCloud(result.canSyncToCloud);
      setIsLoading(false);
    };

    hydrate();
    return () => { mounted = false; };
  }, []);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const project = createProjectDraft(`Untitled Scene ${projects.length + 1}`);
      await saveProject(project);
      router.push(`/projects/${project.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await syncLocalProjectsToCloud();
      const refreshed = await loadProjects();
      setProjects(refreshed.projects);
      setSource(refreshed.source);
      setCanSyncToCloud(refreshed.canSyncToCloud);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-screen">
      {/* Ambient page glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(29,212,246,0.06),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(142,207,190,0.05),transparent_45%)]" />
      {/* ── Header ── */}
      <div className="sticky top-14 z-10 border-b border-vertra-border/40 bg-vertra-bg/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-vertra-text-dim">
                {source === 'cloud' ? 'Cloud Workspace' : 'Local Guest Mode'}
              </p>
              <h1 className="text-3xl font-bold text-vertra-text">Projects</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <Input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search className="h-3.5 w-3.5" />}
                containerClassName="gap-2 rounded-lg border border-vertra-border/40 bg-vertra-surface-alt/60 px-3 py-2 focus-within:border-vertra-cyan/50"
                className="w-36 text-xs placeholder:text-vertra-text-dim/60"
              />

              {/* Source badge */}
              <Badge variant="accent">
                {source === 'cloud' ? (
                  <><Cloud className="h-3 w-3 text-vertra-teal" /> Supabase</>
                ) : (
                  <><HardDrive className="h-3 w-3" /> Local</>
                )}
              </Badge>

              {canSyncToCloud && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3 w-3" />
                  )}
                  Sync to Cloud
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* New project button */}
        <motion.button
          onClick={handleCreateProject}
          disabled={isCreating}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: isCreating ? 1 : 1.005 }}
          className="mb-8 flex h-32 w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-vertra-border/30 bg-linear-to-br from-white/1 to-transparent transition-colors hover:border-vertra-cyan/30 hover:bg-vertra-surface/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? (
            <Loader2 className="h-5 w-5 animate-spin text-vertra-cyan" />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-vertra-border/40 bg-vertra-surface/50 p-2">
              <Plus className="h-5 w-5 text-vertra-text-dim" />
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-vertra-text">
              {isCreating ? 'Creating…' : 'New Project'}
            </p>
            {!isCreating && (
              <p className="text-xs text-vertra-text-dim">Start with an empty scene</p>
            )}
          </div>
        </motion.button>

        {/* Project grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <EmptyState
              icon={<Layers className="h-10 w-10 text-vertra-border" />}
              title={search ? 'No projects match your search' : 'No projects yet'}
              description={search ? 'Try a different search term.' : 'Create your first project above.'}
            />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => {
              const gradient = THUMBNAIL_GRADIENTS[index % THUMBNAIL_GRADIENTS.length];
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05 }}
                >
                  <Link href={`/projects/${project.id}`}>
                    <div className="group cursor-pointer overflow-hidden rounded-xl border border-white/8 bg-linear-to-br from-white/3 to-transparent backdrop-blur-sm transition-all duration-300 hover:border-vertra-cyan/30 hover:shadow-xl hover:shadow-vertra-cyan/5">
                      {/* Thumbnail */}
                      <div className={`relative h-40 bg-linear-to-br ${gradient} to-vertra-bg`}>
                        {/* Perspective grid overlay */}
                        <div
                          className="absolute inset-0 opacity-[0.08]"
                          style={{
                            backgroundImage:
                              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                          }}
                        />
                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Layers className="h-10 w-10 text-white/10 transition-colors duration-300 group-hover:text-vertra-cyan/25" />
                        </div>
                        {/* Hover shimmer */}
                        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-t from-black/20 via-transparent to-transparent" />
                      </div>

                      {/* Card info */}
                      <div className="p-4">
                        <h3 className="mb-0.5 truncate font-semibold text-vertra-text transition-colors duration-200 group-hover:text-vertra-cyan">
                          {project.name}
                        </h3>
                        <p className="text-xs text-vertra-text-dim">
                          {project.description || 'Scene project'}
                        </p>
                        <p className="mt-2 text-xs text-vertra-text-dim/50">
                          Updated {formatRelativeDate(project.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer stats */}
        {!isLoading && projects.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center text-xs text-vertra-text-dim/60"
          >
            {projects.length} project{projects.length !== 1 ? 's' : ''} ·{' '}
            {source === 'cloud' ? 'Cloud' : 'Local Storage'}
          </motion.p>
        )}
      </div>
    </div>
  );
}
