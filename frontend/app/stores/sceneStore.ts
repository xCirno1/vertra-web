import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { Entity, Scene, Transform, Project, Vector3, Euler } from '@/types/scene';

enableMapSet();

interface SceneState {
  // Data
  currentProject: Project | null;
  scene: Scene;
  selectedEntityId: string | null;

  // History
  undoStack: Scene[];
  redoStack: Scene[];

  // Actions
  setCurrentProject: (project: Project) => void;
  setScene: (scene: Scene) => void;
  selectEntity: (id: string | null) => void;
  getSelectedEntity: () => Entity | null;

  // Transform updates
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  updatePosition: (id: string, position: Partial<Vector3>) => void;
  updateRotation: (id: string, rotation: Partial<Euler>) => void;
  updateScale: (id: string, scale: Partial<Vector3>) => void;

  // Entity management
  addEntity: (type: Entity['type'], parentId?: string, name?: string) => Entity;
  removeEntity: (id: string) => void;
  renameEntity: (id: string, name: string) => void;
  duplicateEntity: (id: string) => Entity;

  // Hierarchy
  reparentEntity: (entityId: string, newParentId?: string) => void;
  toggleEntityVisibility: (id: string) => void;
  toggleEntityLocked: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  _saveSnapshot: () => void;
}

function cloneTransform(transform: Transform): Transform {
  return {
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale },
    matrix: transform.matrix ? new Float32Array(transform.matrix) : undefined,
  };
}

function cloneEntity(entity: Entity): Entity {
  return {
    ...entity,
    children: [...entity.children],
    transform: cloneTransform(entity.transform),
    components: JSON.parse(JSON.stringify(entity.components)) as Entity['components'],
    tags: [...entity.tags],
  };
}

function cloneScene(scene: Scene): Scene {
  const entities = new Map<string, Entity>();

  scene.entities.forEach((entity, id) => {
    entities.set(id, cloneEntity(entity));
  });

  const root = entities.get(scene.root.id) || cloneEntity(scene.root);

  return {
    version: scene.version,
    root,
    entities,
    metadata: { ...scene.metadata },
  };
}

function isDescendant(
  scene: Scene,
  parentCandidateId: string,
  descendantCandidateId: string
): boolean {
  const parentEntity = scene.entities.get(parentCandidateId);
  if (!parentEntity) {
    return false;
  }

  if (parentEntity.children.includes(descendantCandidateId)) {
    return true;
  }

  return parentEntity.children.some((childId) =>
    isDescendant(scene, childId, descendantCandidateId)
  );
}

// Helper to create empty scene
function createEmptyScene(): Scene {
  const rootId = 'root-' + Math.random().toString(36).slice(2, 11);
  const root: Entity = {
    id: rootId,
    name: 'Scene',
    type: 'group',
    children: [],
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: {},
    visible: true,
    locked: false,
    tags: [],
  };

  return {
    version: '2024-1',
    root,
    entities: new Map([[rootId, root]]),
    metadata: {
      gridSize: 1.0,
      backgroundColor: '#0a0a0c',
      renderScale: 1.0,
    },
  };
}

export const useSceneStore = create<SceneState>()(
  immer((set, get) => ({
    currentProject: null,
    scene: createEmptyScene(),
    selectedEntityId: null,
    undoStack: [],
    redoStack: [],

    setCurrentProject: (project: Project) => {
      set((state) => {
        state.currentProject = {
          ...project,
          scene: cloneScene(project.scene),
        };
        state.scene = cloneScene(project.scene);
        state.selectedEntityId = null;
        state.undoStack = [];
        state.redoStack = [];
      });
    },

    setScene: (scene: Scene) => {
      set((state) => {
        state.scene = cloneScene(scene);

        if (
          state.selectedEntityId &&
          !state.scene.entities.has(state.selectedEntityId)
        ) {
          state.selectedEntityId = null;
        }
      });
    },

    selectEntity: (id: string | null) => {
      set((state) => {
        state.selectedEntityId = id;
      });
    },

    getSelectedEntity: () => {
      const { scene, selectedEntityId } = get();
      if (!selectedEntityId) return null;
      return scene.entities.get(selectedEntityId) || null;
    },

    updateTransform: (id: string, partial: Partial<Transform>) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (!entity) return;

        entity.transform = {
          ...entity.transform,
          ...partial,
        };
      });
    },

    updatePosition: (id: string, position: Partial<Vector3>) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (!entity) return;

        entity.transform.position = {
          ...entity.transform.position,
          ...position,
        };
      });
    },

    updateRotation: (id: string, rotation: Partial<Euler>) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (!entity) return;

        entity.transform.rotation = {
          ...entity.transform.rotation,
          ...rotation,
        };
      });
    },

    updateScale: (id: string, scale: Partial<Vector3>) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (!entity) return;

        entity.transform.scale = {
          ...entity.transform.scale,
          ...scale,
        };
      });
    },

    addEntity: (type: Entity['type'], parentId?: string, name?: string) => {
      get()._saveSnapshot();

      const id = `entity-${Math.random().toString(36).slice(2, 11)}`;
      const defaultName =
        type.charAt(0).toUpperCase() + type.slice(1) + '-' + id.slice(7, 10);

      const newEntity: Entity = {
        id,
        name: name || defaultName,
        type,
        parentId: parentId || get().scene.root.id,
        children: [],
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        components: {},
        visible: true,
        locked: false,
        tags: [],
      };

      set((state) => {
        state.scene.entities.set(id, newEntity);

        const parentId = newEntity.parentId || state.scene.root.id;
        const parent = state.scene.entities.get(parentId);
        if (parent) {
          parent.children.push(id);
        }
      });
      return newEntity;
    },

    removeEntity: (id: string) => {
      if (id === get().scene.root.id) {
        return;
      }

      get()._saveSnapshot();

      set((state) => {
        const entity = state.scene.entities.get(id);
        if (!entity) return;

        // Remove from parent's children
        if (entity.parentId) {
          const parent = state.scene.entities.get(entity.parentId);
          if (parent) {
            parent.children = parent.children.filter((child) => child !== id);
          }
        }

        // Remove all children recursively
        const removeChildren = (entityId: string) => {
          const ent = state.scene.entities.get(entityId);
          if (ent) {
            ent.children.forEach(removeChildren);
            state.scene.entities.delete(entityId);
          }
        };

        removeChildren(id);

        // Deselect if was selected
        if (state.selectedEntityId === id) {
          state.selectedEntityId = null;
        }
      });
    },

    renameEntity: (id: string, name: string) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (entity) {
          entity.name = name;
        }
      });
    },

    duplicateEntity: (id: string) => {
      const original = get().scene.entities.get(id);
      if (!original) throw new Error('Entity not found');

      get()._saveSnapshot();

      const newId = `entity-${Math.random().toString(36).slice(2, 11)}`;
      const duplicate = cloneEntity(original);
      duplicate.id = newId;
      duplicate.name = `${original.name} (copy)`;
      duplicate.children = [];

      set((state) => {
        state.scene.entities.set(newId, duplicate);

        const parentId = duplicate.parentId || state.scene.root.id;
        const parent = state.scene.entities.get(parentId);
        if (parent) {
          parent.children.push(newId);
        }
      });
      return duplicate;
    },

    reparentEntity: (entityId: string, newParentId?: string) => {
      const { scene } = get();
      const rootId = scene.root.id;

      if (entityId === rootId) {
        return;
      }

      const targetParentId = newParentId || rootId;

      if (
        entityId === targetParentId ||
        isDescendant(scene, entityId, targetParentId)
      ) {
        return;
      }

      get()._saveSnapshot();

      set((state) => {
        const entity = state.scene.entities.get(entityId);
        if (!entity) return;

        // Remove from old parent
        if (entity.parentId) {
          const oldParent = state.scene.entities.get(entity.parentId);
          if (oldParent) {
            oldParent.children = oldParent.children.filter(
              (child) => child !== entityId
            );
          }
        }

        // Add to new parent
        entity.parentId = newParentId || state.scene.root.id;
        const newParent = state.scene.entities.get(entity.parentId);
        if (newParent) {
          newParent.children.push(entityId);
        }
      });
    },

    toggleEntityVisibility: (id: string) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (entity) {
          entity.visible = !entity.visible;
        }
      });
    },

    toggleEntityLocked: (id: string) => {
      get()._saveSnapshot();
      set((state) => {
        const entity = state.scene.entities.get(id);
        if (entity) {
          entity.locked = !entity.locked;
        }
      });
    },

    undo: () => {
      const { undoStack, scene } = get();
      if (undoStack.length === 0) return;

      const previousScene = undoStack[undoStack.length - 1];

      set((state) => {
        state.redoStack = [cloneScene(scene), ...state.redoStack];
        state.undoStack = undoStack.slice(0, -1);
        state.scene = cloneScene(previousScene);

        if (
          state.selectedEntityId &&
          !state.scene.entities.has(state.selectedEntityId)
        ) {
          state.selectedEntityId = null;
        }
      });
    },

    redo: () => {
      const { redoStack, scene } = get();
      if (redoStack.length === 0) return;

      const nextScene = redoStack[0];

      set((state) => {
        state.undoStack = [...state.undoStack, cloneScene(scene)];
        state.redoStack = redoStack.slice(1);
        state.scene = cloneScene(nextScene);
      });
    },

    _saveSnapshot: () => {
      set((state) => {
        // Keep undo stack to max 50 entries to prevent memory bloat
        state.undoStack = [...state.undoStack, cloneScene(state.scene)].slice(-50);
        state.redoStack = [];
      });
    },
  }))
);
