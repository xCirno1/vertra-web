/**
 * Vertra Engine Helper Utilities
 * 
 * Provides convenient wrappers and utilities for interacting with the Vertra WASM engine,
 * including geometry creation, scene object spawning, and file I/O.
 */

import { Scene, VertraObject, Geometry } from '../../../public/engine/vertra_binder.js';

export type GeometryType = 'cube' | 'box' | 'sphere' | 'pyramid' | 'plane';

export interface GeometryParams {
  type: GeometryType;
  params?: {
    size?: number;
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    subdivisions?: number;
    baseSize?: number;
  };
}

export interface SpawnObjectOptions {
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: [number, number, number, number];
  geometry?: GeometryParams;
  parentId?: number | null;
}

/**
 * Factory function to create geometry based on type and parameters.
 * 
 * @param type - The geometry type (cube, box, sphere, pyramid, plane)
 * @param params - Type-specific parameters for the geometry
 * @returns A Geometry instance ready to attach to a scene object
 * 
 * @example
 * const geo = createGeometry('cube', { size: 2 });
 * const geo = createGeometry('box', { width: 3, height: 2, depth: 1 });
 * const geo = createGeometry('sphere', { radius: 1.5, subdivisions: 32 });
 */
export function createGeometry(type: GeometryType, params?: GeometryParams['params']): Geometry {
  switch (type) {
    case 'cube':
      return Geometry.cube(params?.size ?? 1);

    case 'box':
      return Geometry.box(
        params?.width ?? 1,
        params?.height ?? 1,
        params?.depth ?? 1,
      );

    case 'sphere':
      return Geometry.sphere(
        params?.radius ?? 1,
        params?.subdivisions ?? 32,
      );

    case 'pyramid':
      return Geometry.pyramid(
        params?.baseSize ?? 1,
        params?.height ?? 1,
      );

    case 'plane':
      return Geometry.plane(params?.size ?? 1);

    default:
      throw new Error(`Unknown geometry type: ${type}`);
  }
}

/**
 * Create a new VertraObject with the specified geometry and properties.
 * 
 * This creates a scene object (VertraObject) that can be spawned into a scene.
 * The object includes geometry, color, transform, and other properties.
 * 
 * @param options - Configuration for the object
 * @returns A VertraObject ready to spawn into a scene
 * 
 * @example
 * const obj = createSceneObject({
 *   name: 'My Cube',
 *   position: [0, 1, 0],
 *   geometry: { type: 'cube', params: { size: 2 } },
 *   color: [1, 0, 0, 1] // Red
 * });
 * const id = scene.spawn(obj);
 */
export function createSceneObject(options: SpawnObjectOptions): VertraObject {
  // Import VertraObject dynamically to avoid circular dependencies
  const { VertraObject: VertraObjectClass } = require('../../public/engine/vertra_binder.js');

  // Create base object with name
  const obj = new VertraObjectClass(options.name ?? 'Object');

  // Set geometry if specified
  if (options.geometry) {
    const geo = createGeometry(options.geometry.type, options.geometry.params);
    obj.set_geometry(geo);
  }

  // Set color if specified (RGBA)
  if (options.color) {
    const [r, g, b, a] = options.color;
    obj.set_color(r, g, b, a);
  }

  // Set transform if specified
  if (options.position || options.rotation || options.scale) {
    const t = obj.transform;
    if (options.position) {
      t.position = new Float32Array(options.position);
    }
    if (options.rotation) {
      t.rotation = new Float32Array(options.rotation);
    }
    if (options.scale) {
      t.scale = new Float32Array(options.scale);
    }
    obj.transform = t;
  }

  return obj;
}

/**
 * Spawn a new object into the scene with geometry.
 * 
 * Convenience wrapper that combines createSceneObject and scene.spawn.
 * 
 * @param scene - The Scene to spawn into
 * @param options - Object configuration
 * @returns The unique ID of the spawned object
 * 
 * @example
 * const objectId = spawnGeometryObject(scene, {
 *   name: 'Red Cube',
 *   position: [0, 0, 0],
 *   geometry: { type: 'cube', params: { size: 1 } },
 *   color: [1, 0, 0, 1],
 * });
 */
export function spawnGeometryObject(
  scene: Scene,
  options: SpawnObjectOptions,
): number {
  const obj = createSceneObject(options);
  return scene.spawn(obj, options.parentId ?? null);
}

/**
 * Batch spawn multiple objects into the scene.
 * 
 * Useful for creating complex scenes with multiple objects.
 * 
 * @param scene - The Scene to spawn into
 * @param objects - Array of object configurations
 * @returns Array of spawned object IDs
 * 
 * @example
 * const ids = spawnGeometryObjects(scene, [
 *   { name: 'Cube', geometry: { type: 'cube', params: { size: 1 } } },
 *   { name: 'Sphere', geometry: { type: 'sphere', params: { radius: 1 } } },
 * ]);
 */
export function spawnGeometryObjects(
  scene: Scene,
  objects: SpawnObjectOptions[],
): number[] {
  return objects.map(obj => spawnGeometryObject(scene, obj));
}

/**
 * Get all available geometry types.
 * 
 * @returns Array of geometry type names
 */
export function getAvailableGeometryTypes(): GeometryType[] {
  return ['cube', 'box', 'sphere', 'pyramid', 'plane'];
}
