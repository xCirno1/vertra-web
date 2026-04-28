import { Scene, Entity, SerializedScene, SerializedEntity } from '@/types/scene';

/**
 * Scene Serialization - Convert between Scene and JSON formats
 */

export function serializeScene(scene: Scene): SerializedScene {
  const entityArray: SerializedEntity[] = [];

  // Convert Map to array and serialize entities
  scene.entities.forEach((entity) => {
    entityArray.push(serializeEntity(entity));
  });

  return {
    version: scene.version,
    root: serializeEntity(scene.root),
    entities: entityArray,
    metadata: scene.metadata,
  };
}

export function serializeEntity(entity: Entity): SerializedEntity {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    parentId: entity.parentId,
    children: entity.children,
    transform: entity.transform,
    components: entity.components,
    visible: entity.visible,
    locked: entity.locked,
    tags: entity.tags,
  };
}

export function deserializeScene(data: SerializedScene): Scene {
  const entities = new Map<string, Entity>();

  // Restore all entities
  data.entities.forEach((serialized) => {
    entities.set(serialized.id, {
      ...serialized,
      components: serialized.components || {},
    });
  });

  // Ensure root exists
  if (!entities.has(data.root.id)) {
    entities.set(data.root.id, {
      ...data.root,
      components: data.root.components || {},
    });
  }

  return {
    version: '2024-1',
    root: data.root as Entity,
    entities,
    metadata: data.metadata,
  };
}

export function exportSceneAsJSON(scene: Scene): string {
  const serialized = serializeScene(scene);
  return JSON.stringify(serialized, null, 2);
}

export function importSceneFromJSON(jsonString: string): Scene {
  const data = JSON.parse(jsonString) as SerializedScene;
  return deserializeScene(data);
}
