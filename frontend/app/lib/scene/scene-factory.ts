import { Entity, Scene, MeshComponent, LightComponent, CameraComponent } from '@/types/scene';

/**
 * Scene Factory - Create and initialize scene objects
 */

export function createEmptyScene(): Scene {
  const rootId = 'root-' + Math.random().toString(36).substr(2, 9);
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

export function createMeshEntity(
  name: string = 'Mesh',
  parentId?: string
): Entity {
  const meshComponent: MeshComponent = {
    type: 'mesh',
    enabled: true,
    geometry: {
      type: 'box',
      params: {
        width: 1,
        height: 1,
        depth: 1,
      },
    },
    material: {
      type: 'standard',
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.5,
      emissive: '#000000',
    },
    castShadow: true,
    receiveShadow: true,
  };

  return {
    id: 'entity-' + Math.random().toString(36).substr(2, 9),
    name,
    type: 'mesh',
    parentId,
    children: [],
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: { mesh: meshComponent },
    visible: true,
    locked: false,
    tags: [],
  };
}

export function createLightEntity(
  name: string = 'Light',
  parentId?: string
): Entity {
  const lightComponent: LightComponent = {
    type: 'light',
    enabled: true,
    lightType: 'directional',
    color: '#ffffff',
    intensity: 1.0,
  };

  return {
    id: 'entity-' + Math.random().toString(36).substr(2, 9),
    name,
    type: 'light',
    parentId,
    children: [],
    transform: {
      position: { x: 5, y: 10, z: 7 },
      rotation: { x: -0.5, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: { light: lightComponent },
    visible: true,
    locked: false,
    tags: [],
  };
}

export function createCameraEntity(
  name: string = 'Camera',
  parentId?: string
): Entity {
  const cameraComponent: CameraComponent = {
    type: 'camera',
    enabled: true,
    isActive: true,
    fov: 75,
    near: 0.1,
    far: 1000,
  };

  return {
    id: 'entity-' + Math.random().toString(36).substr(2, 9),
    name,
    type: 'camera',
    parentId,
    children: [],
    transform: {
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    },
    components: { camera: cameraComponent },
    visible: true,
    locked: false,
    tags: [],
  };
}
