'use client';

import { useMemo, useState } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { ChevronRight, Box, Lightbulb, Camera, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelHeader } from '@/components/ui/panel-header';
import { Button } from '@/components/ui/button';
import type { DragEvent } from 'react';

export default function SceneTree() {
  const { scene, selectedEntityId, selectEntity, reparentEntity } = useSceneStore();
  const { toggleSidebar } = useUIStore();
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const hasEntities = useMemo(() => scene.entities.size > 1, [scene.entities]);

  const isDescendant = (parentId: string, candidateId: string): boolean => {
    const parent = scene.entities.get(parentId);
    if (!parent) return false;

    if (parent.children.includes(candidateId)) {
      return true;
    }

    return parent.children.some((childId) => isDescendant(childId, candidateId));
  };

  const canDropOnTarget = (
    targetId: string,
    sourceId: string | null = draggedEntityId
  ): boolean => {
    if (!sourceId) {
      return false;
    }

    if (sourceId === targetId) {
      return false;
    }

    if (sourceId === scene.root.id) {
      return false;
    }

    return !isDescendant(sourceId, targetId);
  };

  const renderEntity = (entityId: string, depth: number = 0) => {
    const entity = scene.entities.get(entityId);
    if (!entity) return null;

    const isSelected = selectedEntityId === entityId;
    const hasChildren = entity.children.length > 0;

    const getEntityStyle = (): { color: string; icon: React.ReactNode } => {
      switch (entity.type) {
        case 'mesh':
          return { color: 'text-vertra-cyan', icon: <Box className="w-3.5 h-3.5" /> };
        case 'light':
          return { color: 'text-yellow-400', icon: <Lightbulb className="w-3.5 h-3.5" /> };
        case 'camera':
          return { color: 'text-vertra-teal', icon: <Camera className="w-3.5 h-3.5" /> };
        default:
          return { color: 'text-vertra-text-dim', icon: <ChevronRight className="w-3.5 h-3.5" /> };
      }
    };
    const { color: entityColor, icon: entityIcon } = getEntityStyle();

    return (
      <div key={entityId}>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: 4 }}
        >
          <div
            onClick={() => selectEntity(entityId)}
            draggable={entityId !== scene.root.id}
            onDragStart={(event: DragEvent<HTMLDivElement>) => {
              setDraggedEntityId(entityId);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', entityId);
            }}
            onDragEnd={() => {
              setDraggedEntityId(null);
              setDropTargetId(null);
            }}
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              if (!canDropOnTarget(entityId)) {
                return;
              }

              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTargetId(entityId);
            }}
            onDragLeave={() => {
              if (dropTargetId === entityId) {
                setDropTargetId(null);
              }
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();

              const droppedEntityId =
                draggedEntityId || event.dataTransfer.getData('text/plain') || null;

              if (!canDropOnTarget(entityId, droppedEntityId)) {
                setDraggedEntityId(null);
                setDropTargetId(null);
                return;
              }

              reparentEntity(droppedEntityId as string, entityId);
              selectEntity(droppedEntityId);
              setDraggedEntityId(null);
              setDropTargetId(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${isSelected
              ? 'bg-vertra-cyan/15 text-vertra-text'
              : 'hover:bg-vertra-surface hover:text-vertra-text'
              } ${dropTargetId === entityId ? 'ring-1 ring-inset ring-vertra-cyan' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            {!hasChildren && <div className="w-3" />}
            <span className={entityColor}>{entityIcon}</span>
            <span className="text-xs truncate">{entity.name}</span>
          </div>
        </motion.div>

        {/* Render children */}
        {entity.children.map((childId) => renderEntity(childId, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title="Scene Graph"
        subtitle="Drag entities to re-parent"
        titleClassName="text-sm normal-case tracking-normal"
        actions={
          <Button variant="icon" size="sm" onClick={toggleSidebar} title="Close panel">
            <X className="w-3.5 h-3.5" />
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {!hasEntities ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-[92%]" />
            <Skeleton className="h-7 w-[84%]" />
          </div>
        ) : (
          renderEntity(scene.root.id)
        )}
      </div>
    </div>
  );
}
