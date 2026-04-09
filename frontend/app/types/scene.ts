// Primitive types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Euler {
  x: number;
  y: number;
  z: number;
  order: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
}

// Transform - always present on entities
export interface Transform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  matrix?: Float32Array; // Cached for performance
}

// Component system
export interface Component {
  enabled: boolean;
}

export interface MeshComponent extends Component {
  type: 'mesh';
  geometry: {
    type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'custom';
    params: Record<string, number>;
  };
  material: {
    type: 'standard' | 'physical' | 'basic';
    color: string;
    metalness: number;
    roughness: number;
    emissive: string;
    wireframe?: boolean;
  };
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface LightComponent extends Component {
  type: 'light';
  lightType: 'directional' | 'point' | 'spot' | 'hemisphere';
  color: string;
  intensity: number;
  distance?: number;
  angle?: number;
}

export interface CameraComponent extends Component {
  type: 'camera';
  isActive: boolean;
  fov: number;
  near: number;
  far: number;
}

// Entity - represents a scene object
export interface Entity {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'group';
  parentId?: string;
  children: string[];

  // Transform always present
  transform: Transform;

  // Component system
  components: Record<string, MeshComponent | LightComponent | CameraComponent>;

  // Metadata
  visible: boolean;
  locked: boolean;
  tags: string[];
}

// Scene - collection of entities
export interface Scene {
  version: '2024-1';
  root: Entity;
  entities: Map<string, Entity>;
  metadata: {
    gridSize: number;
    backgroundColor: string;
    renderScale: number;
  };
}

// Project - top-level container
export interface Project {
  id: string;
  name: string;
  ownerId: string;
  scene: Scene;
  script?: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
}

// UI selection
export type SelectionMode = 'translate' | 'rotate' | 'scale' | 'none';

// Undo/Redo
export interface HistoryEntry {
  scene: Scene;
  timestamp: number;
  description: string;
}

// API types
export interface SerializedScene {
  version: string;
  root: SerializedEntity;
  entities: SerializedEntity[];
  metadata: Scene['metadata'];
}

export interface SerializedEntity extends Omit<Entity, 'components'> {
  components: Record<string, any>;
}
