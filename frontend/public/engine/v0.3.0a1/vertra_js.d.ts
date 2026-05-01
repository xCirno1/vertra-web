/* tslint:disable */
/* eslint-disable */

/**
 * Upload raw RGBA8 pixel data as a texture identified by `path_key`.
 *
 * Any `VertraObject` whose `texture_path` equals `path_key` will be rendered
 * with this texture.  Typical usage from JavaScript:
 *
 * ```ts
 * // 1. Fetch the image and decode it into ImageData
 * const blob  = await fetch('assets/texture.png').then(r => r.blob());
 * const img   = await createImageBitmap(blob);
 * const cvs   = new OffscreenCanvas(img.width, img.height);
 * const ctx   = cvs.getContext('2d')!;
 * ctx.drawImage(img, 0, 0);
 * const pixels = ctx.getImageData(0, 0, img.width, img.height);
 *
 * // 2. Upload to the engine
 * scene.load_texture_from_rgba('assets/texture.png', img.width, img.height, pixels.data);
 * ```
 *
 * The key **must** match the `texture_path` set on the object.
 */
export interface SceneTextureMethods {
    load_texture_from_rgba(path_key: string, width: number, height: number, data: Uint8ClampedArray | Uint8Array): void;
    unload_texture(path_key: string): boolean;
    has_texture(path_key: string): boolean;
}



/** Callbacks for a per-object [`JsScript`]. */
export interface JsScriptOptions {
    /** Called once when the script is first activated. */
    on_start?: (id: number, world: World) => void;
    /** Called every frame (variable dt in seconds). */
    on_update?: (id: number, world: World, dt: number) => void;
    /** Called at the fixed timestep (~60 Hz, fixed dt in seconds). */
    on_fixed_update?: (id: number, world: World, dt: number) => void;
}



/** Configuration options for initialising a new `Camera` instance. */
export interface JsCameraOptions {
    /** The aspect ratio of the viewport (`width / height`). */
    aspect?: number;
    /** Vertical field of view in degrees. */
    fov?: number;
    /** Distance to the near clipping plane. */
    znear?: number;
    /** Distance to the far clipping plane. */
    zfar?: number;
    /** Initial left-right (yaw) rotation in degrees. */
    lr_rot?: number;
    /** Initial up-down (pitch) rotation in degrees. */
    ud_rot?: number;
    /** Initial world-space position as `[x, y, z]`. */
    position?: [number, number, number];
}



/** Configuration options for initialising a new `VertraObject`. */
export interface JsObjectOptions {
    /**
     * A stable string identifier used for world lookups via `World.get_id`.
     * If omitted, a random UUID is generated automatically.
     */
    str_id?: string;
    /** Initial RGBA colour of the object as `[r, g, b, a]` in the range `0.0–1.0`. */
    color?: [number, number, number, number];
}



/** Spatial configuration passed to the `Transform` constructor. */
export interface TransformOptions {
    /** World-space position as `[x, y, z]`. Defaults to `[0, 0, 0]`. */
    position?: [number, number, number];
    /** Euler rotation in degrees as `[rx, ry, rz]`. Defaults to `[0, 0, 0]`. */
    rotation?: [number, number, number];
    /** Per-axis scale factors as `[sx, sy, sz]`. Defaults to `[1, 1, 1]`. */
    scale?: [number, number, number];
}



export interface InspectorData {
    id: number;
    name: string;
    str_id: string;
    position: [number, number, number];
    rotation_deg: [number, number, number];
    scale: [number, number, number];
    color: [number, number, number, number];
    geometry_type: string | null;
}
export type EditorEventPayload =
| { type: "mouse_motion";   dx: number; dy: number }
| { type: "cursor_moved";   x: number;  y: number  }
| { type: "mouse_button";   left?: boolean; middle?: boolean; right?: boolean }
| { type: "scroll";         delta: number }
| { type: "modifiers";      alt: boolean; ctrl: boolean }
| { type: "focus_key" }
| { type: "key_pressed";    code: string }
| { type: "key_released";   code: string };
export type EditorEventType =
| { type: "gizmo_mode_changed"; mode: string }
| { type: "drag_start";         axis: string }
| { type: "drag_end" }
| { type: "selection_changed";  data: InspectorData | null };
export type EngineMode = "editor" | "play";



export interface SceneScriptMethods {
    /**
     * Attach a script to object `id`.
     *
     * Replaces any previously attached script.  `on_start` will be called on
     * the next frame before `on_update`.
     */
    attach_script(id: number, script: JsScript): void;
    /**
     * Detach and drop the script for object `id`.
     *
     * Returns `true` if a script existed and was removed.
     */
    detach_script(id: number): boolean;
    /** Returns `true` when object `id` has a script attached. */
    has_script(id: number): boolean;
}



/**
 * A 3D camera that controls the viewpoint and projection used to render the scene.
 *
 * Manages the view and projection matrices, world-space position, and look direction.
 * The engine owns one camera per [`Scene`]; obtain it via [`Scene::camera`].
 */
export class Camera {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Moves the camera using keyboard input from a set of currently-held keys.
     *
     * Recognises WASD and Arrow key codes as returned by `KeyboardEvent.code`.
     * This is a convenience helper for play-mode first-person navigation;
     * the editor uses its own internal WASD handler.
     *
     * # Arguments
     *
     * * `pressed_keys` - Slice of active key-code strings
     *   (e.g. `["KeyW", "ShiftLeft"]`).
     * * `speed` - Movement speed in world units per second.
     * * `dt`    - Delta time since the last frame, in seconds.
     */
    handle_input_default(pressed_keys: string[], speed: number, dt: number): void;
    /**
     * Moves the camera along an arbitrary world-space direction vector.
     *
     * # Arguments
     *
     * * `direction` - A 3-element `[x, y, z]` direction vector.
     *   Does not need to be normalised.
     * * `amount` - Distance to travel in world units.
     *
     * # Errors
     *
     * Returns a [`JsError`] when `direction` does not contain exactly 3 elements.
     */
    move_by(direction: Float32Array, amount: number): void;
    /**
     * Creates a new `Camera` from optional configuration values.
     *
     * Any omitted fields fall back to engine defaults (aspect `1.0`, fov `45°`,
     * znear `0.1`, zfar `1000.0`).
     *
     * # Arguments
     *
     * * `options` - A [`JsCameraOptions`] object; all fields are optional.
     */
    constructor(options: JsCameraOptions);
    /**
     * Rotates the camera by applying yaw and pitch deltas.
     *
     * Typically called with the raw `movementX` / `movementY` values from a
     * browser `mousemove` event.
     *
     * # Arguments
     *
     * * `dx`       - Horizontal mouse delta in pixels (positive = look right).
     * * `dy`       - Vertical mouse delta in pixels (positive = look down).
     * * `inverted` - When `true` the pitch direction is flipped (inverted Y).
     */
    rotate(dx: number, dy: number, inverted: boolean): void;
    /**
     * Updates the aspect ratio used by the projection matrix.
     *
     * Call this whenever the canvas or window is resized so that the projection
     * stays geometrically correct.
     *
     * # Arguments
     *
     * * `aspect` - The new aspect ratio (`viewport_width / viewport_height`).
     */
    set_aspect(aspect: number): void;
}

export class Editor {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    clear_inspector(): void;
    clear_selection(): void;
    editor_event(payload: any): void;
    get_pivot(): any;
    group_ids(): Uint32Array;
    inspector(): any;
    is_editor_mode(): boolean;
    is_multi_selected(id: number): boolean;
    is_play_mode(): boolean;
    mode(): string;
    multi_selected_ids(): Uint32Array;
    set_camera_speed(speed: number): void;
    set_multi_selected(ids: Uint32Array): void;
    set_pivot(x: number, y: number, z: number): void;
}

/**
 * Contains information about the current frame.
 */
export class FrameContext {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Time elapsed since the last frame in seconds.
     */
    dt: number;
}

/**
 * Represents a 3D mesh definition that can be attached to a scene object for rendering.
 */
export class Geometry {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates a rectangular box with independent dimensions on each axis.
     *
     * # Arguments
     *
     * * `width`  - Size along the X-axis.
     * * `height` - Size along the Y-axis.
     * * `depth`  - Size along the Z-axis.
     */
    static box(width: number, height: number, depth: number): Geometry;
    /**
     * Creates a cube where all sides are equal in length.
     *
     * # Arguments
     *
     * * `size` - The length of each side of the cube in world units.
     */
    static cube(size: number): Geometry;
    /**
     * Creates a flat, square surface lying on the XZ plane.
     *
     * # Arguments
     *
     * * `size` - The side length of the square plane in world units.
     */
    static plane(size: number): Geometry;
    /**
     * Creates a four-sided pyramid with a square base.
     *
     * # Arguments
     *
     * * `base_size` - The side length of the square base in world units.
     * * `height`    - Vertical distance from the base to the apex.
     */
    static pyramid(base_size: number, height: number): Geometry;
    /**
     * Creates a spherical mesh.
     *
     * # Arguments
     *
     * * `radius`       - Distance from the centre to the surface in world units.
     * * `subdivisions` - Smoothness level; higher values produce more triangles.
     */
    static sphere(radius: number, subdivisions: number): Geometry;
}

/**
 * A script object that can be attached to a scene object.
 *
 * Create one with the constructor, supplying up to three callback functions,
 * then attach it to an object ID via [`Scene::attach_script`].
 */
export class JsScript {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create a new script from an options object with optional callback fields.
     *
     * ```js
     * const script = new JsScript({
     *   on_update(id, world, dt) { }, // Do anything inside this callback!
     * });
     * ```
     */
    constructor(options: any);
}

/**
 * The root container for a 3D environment.
 *
 * Manages the object lifecycle, scene hierarchy, GPU pipeline, and the active
 * viewport camera.  One `Scene` exists per [`WebWindow`] and is passed to
 * every callback (`on_startup`, `on_update`, `on_draw_request`).
 */
export class Scene {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Attach a [`JsScript`] to object `id`.
     *
     * `on_start` will be called on the next frame before `on_update`.
     * Replaces any previously attached script.
     *
     * # Arguments
     *
     * * `id`     - Integer ID of the target object.
     * * `script` - A [`JsScript`] constructed with callback functions.
     */
    attach_script(id: number, script: JsScript): void;
    /**
     * Detach and drop the script for object `id`.
     *
     * Returns `true` if a script existed and was removed, `false` otherwise.
     */
    detach_script(id: number): boolean;
    /**
     * Exits editor mode and switches to **play mode**.
     *
     * Drops all editor state (selection, gizmos, skybox, orbit pivot).
     * After this call [`Scene::is_editor_mode`] returns `false` and all
     * `with_event_handler` callbacks start receiving raw input events again.
     *
     * > **Keybind:** pressing `Escape` while in editor mode calls this
     * > automatically and also fires the [`WebWindow::on_play`] callback.
     */
    disable_editor_mode(): void;
    /**
     * Activates static editor mode.
     *
     * Spawns the XYZ axis gizmos and enables orbit / pan / zoom camera
     * controls and object picking.  Call once from `on_startup`.
     */
    enable_editor_mode(): void;
    /**
     * Returns `true` when object `id` has a script attached.
     */
    has_script(id: number): boolean;
    /**
     * Returns `true` if a texture has been uploaded under `path_key`.
     */
    has_texture(path_key: string): boolean;
    /**
     * Returns `true` when the scene is currently in **editor mode**, `false`
     * when in play mode.
     *
     * Shorthand for `scene.editor.is_editor_mode()`.
     */
    is_editor_mode(): boolean;
    /**
     * Upload raw RGBA8 pixel data as a texture registered under `path_key`.
     *
     * Any object whose `texture_path` matches `path_key` will be rendered
     * with this texture.  Pass a `Uint8ClampedArray` from `ImageData.data`
     * (4 bytes per pixel: R, G, B, A in that order).
     *
     * # Arguments
     * * `path_key` - key matching `VertraObject.texture_path`
     * * `width`    - image width in pixels
     * * `height`   - image height in pixels
     * * `data`     - raw RGBA8 bytes (`width * height * 4` bytes)
     */
    load_texture_from_rgba(path_key: string, width: number, height: number, data: Uint8Array): void;
    /**
     * Replaces the current camera and world state from a VTR binary buffer.
     *
     * The GPU pipeline is unaffected — only the logical scene state (camera,
     * objects, hierarchy) is replaced.
     *
     * # Arguments
     *
     * * `data` - A `Uint8Array` previously produced by [`Scene::save_vtr`].
     *
     * # Errors
     *
     * Returns a [`JsValue`] error string when the data is corrupt, truncated,
     * or written by an incompatible format version.
     */
    load_vtr(data: Uint8Array): void;
    /**
     * Exports the entire scene (camera + world) as a VTR binary buffer.
     *
     * The buffer can be stored, transferred, and later reloaded with
     * [`Scene::load_vtr`].
     *
     * # Returns
     *
     * A `Uint8Array` containing the serialised scene data.
     *
     * # Errors
     *
     * Returns a [`JsValue`] error string on serialisation failure.
     */
    save_vtr(): Uint8Array;
    /**
     * Spawns a new object into the scene hierarchy.
     *
     * # Arguments
     *
     * * `object`    - The object template to clone into the scene.
     * * `parent_id` - ID of an existing object to attach this object to as a
     *   child.  Pass `undefined` / `null` to add the object at the scene root.
     *
     * # Returns
     *
     * The unique integer ID assigned to the new object instance.
     */
    spawn(object: VertraObject, parent_id?: number | null): number;
    /**
     * Remove a previously-loaded texture.
     *
     * Objects that referenced `path_key` fall back to vertex colour rendering.
     * Returns `true` if the texture existed and was removed.
     */
    unload_texture(path_key: string): boolean;
    /**
     * Returns the primary camera used to render this scene.
     *
     * The camera is owned by the scene; do not attempt to manually destroy it
     * on the JavaScript side.
     */
    readonly camera: Camera;
    /**
     * Returns a handle to the editor subsystem.
     *
     * Use this to query and mutate selection state, dispatch input events,
     * check the current engine mode, and so on.  All mutating methods are
     * no-ops when editor mode is not active.
     */
    readonly editor: Editor;
    /**
     * Returns a handle to the underlying [`World`] data structure.
     *
     * Use this to query entities, batch-update transforms, or delete objects.
     */
    readonly world: World;
}

/**
 * Manages the spatial state of a scene object: position, rotation, and scale.
 *
 * Used to calculate local-to-world matrices and hierarchy transformations.
 */
export class Transform {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Composes this transform with a child transform, returning a new world-space result.
     *
     * Useful for computing the absolute position of a nested object given its
     * local transform relative to a parent.
     *
     * # Arguments
     *
     * * `child` - The local-space transform to apply on top of this parent transform.
     *
     * # Returns
     *
     * A new [`Transform`] representing the composed world-space transformation.
     */
    combine_wasm(child: Transform): Transform;
    /**
     * Creates a new `Transform` with optional initial spatial values.
     *
     * Any omitted fields fall back to their defaults: zero position,
     * zero rotation, and unit scale `[1, 1, 1]`.
     *
     * # Arguments
     *
     * * `options` - A [`TransformOptions`] object with optional `position`,
     *   `rotation`, and `scale` fields.
     */
    constructor(options: TransformOptions);
    /**
     * Returns the world-space position as `[x, y, z]`.
     */
    position: Float32Array;
    /**
     * Returns the Euler rotation as `[rx, ry, rz]` in degrees.
     */
    rotation: Float32Array;
    /**
     * Returns the per-axis scale factors as `[sx, sy, sz]`.
     */
    scale: Float32Array;
}

/**
 * Represents a node in the 3D scene graph.
 *
 * Objects hold a name, a [`Transform`] (position / rotation / scale), and
 * optional geometry and colour data.  Spawn them into a scene with
 * [`Scene::spawn`] or [`World::spawn_object`].
 */
export class VertraObject {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates a new scene object template.
     *
     * The object is not yet part of any scene; call [`Scene::spawn`] or
     * [`World::spawn_object`] to add it to the world.
     *
     * # Arguments
     *
     * * `name`    - Human-readable display name shown in the inspector.
     * * `options` - Optional [`JsObjectOptions`] with `str_id` and/or `color`.
     *   Pass `undefined` or `null` to use defaults (random UUID, white colour).
     */
    constructor(name: string, options?: any | null);
    /**
     * Sets the RGBA colour of the object.
     *
     * # Arguments
     *
     * * `color` - A 4-element `[r, g, b, a]` array with values in `0.0 ..= 1.0`.
     *   Silently ignored when the slice does not contain exactly 4 elements.
     */
    set_color(color: Float32Array): void;
    /**
     * Attaches a mesh geometry to this object for rendering.
     *
     * # Arguments
     *
     * * `geometry` - The geometry variant to attach (cube, sphere, plane, etc.).
     */
    set_geometry(geometry: Geometry): void;
    /**
     * Returns the integer IDs of all direct children of this object.
     *
     * The returned array is a snapshot — mutations made after this call are
     * not reflected in the previously returned value.
     */
    readonly children: Uint32Array;
    /**
     * Returns the number of direct children attached to this object.
     */
    readonly children_count: number;
    /**
     * Returns the current display name of the object.
     */
    name: string;
    /**
     * Returns the integer ID of the parent object, or `undefined` if this is a root object.
     */
    readonly parent: number | undefined;
    /**
     * Returns the stable string identifier assigned at creation time.
     *
     * This value cannot be changed after construction.  Use it with
     * [`World::get_id`] to resolve back to the integer ID at runtime.
     */
    str_id: string;
    /**
     * Returns the path to the texture image applied to this object, or
     * `undefined` when no texture is set.
     */
    get texture_path(): string | undefined;
    /**
     * Sets (or clears) the texture path for this object.
     *
     * Pass `undefined` / `null` to remove the texture and fall back to vertex
     * colour rendering.  Pass a string matching a key previously registered
     * with [`Scene::load_texture_from_rgba`] to apply that texture.
     */
    set texture_path(value: string | null | undefined);
    /**
     * Returns a copy of the object's current transform.
     */
    transform: Transform;
}

/**
 * The main application controller that manages the canvas and the render loop.
 */
export class WebWindow {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Creates a new WebWindow.
     * @param {Camera} camera - The initial camera for the scene.
     * @param {any} [state] - Initial state object passed to every callback.
     */
    constructor(camera: Camera, state?: any | null);
    /**
     * Sets the function to call when the scene needs to be re-rendered.
     * Callback signature: (state, scene, frameContext) => void
     */
    on_draw_request(f: Function): void;
    /**
     * Registers a callback fired when editor state changes.
     *
     * Receives a single [`EditorEventType`] object. Events:
     * - `gizmo_mode_changed` — active gizmo switched (T / R / E keys)
     * - `drag_start` / `drag_end` — gizmo axis drag begins / ends
     * - `selection_changed` — inspector selection changed (click or programmatic);
     *   `data` is [`InspectorData`] or `null` when cleared
     *
     * Callback signature: `(event: EditorEventType) => void`
     */
    on_editor_event(f: Function): void;
    /**
     * Sets the function to call once before the first frame.
     * Callback signature: (state, scene, frameContext) => void
     */
    on_startup(f: Function): void;
    /**
     * Sets the function to call every frame for logic updates.
     * Callback signature: (state, scene, frameContext) => void
     */
    on_update(f: Function): void;
    /**
     * Initializes the engine and starts the RequestAnimationFrame loop.
     * @param {string} canvas_id - The ID of the HTMLCanvasElement to target.
     */
    start(canvas_id: string): void;
    /**
     * Registers a handler for raw input events (keyboard/mouse).
     *
     * Callback signature: (state, scene, event) => void
     *
     * Note: while editor mode is active, these raw input callbacks are paused.
     * Use [`Self::on_editor_event`] to observe editor interactions and state changes instead.
     */
    with_event_handler(f: Function): void;
}

/**
 * The entity management system and scene hierarchy container.
 *
 * Handles creation, destruction, and retrieval of scene objects.
 * Obtain the world for the active scene via [`Scene::world`].
 *
 * # Script-callback safety
 *
 * All mutation methods (`spawn_object`, `delete`, `reparent`,
 * `rename_str_id`) are safe to call from inside an `on_start`,
 * `on_update`, or `on_fixed_update` script callback.  When called during a
 * callback the operation is **silently deferred**: it is placed on an
 * internal queue and replayed against the real world the instant the
 * callback returns.  The JS caller receives the correct return value
 * immediately (e.g. the pre-allocated spawn ID).
 */
export class World {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Removes an object and all of its descendants from the world.
     *
     * When called **inside a script callback** the deletion is deferred until
     * the callback returns.
     *
     * # Arguments
     *
     * * `id` - The unique integer ID of the root object to remove.
     */
    delete(id: number): void;
    /**
     * Resolves a stable string identifier (`str_id`) to its integer ID.
     *
     * > **Performance note:** do not call this inside `on_update` or other
     * > high-frequency loops.  Cache the ID in `on_start` instead.
     */
    get_id(str_id: string): number | undefined;
    /**
     * Retrieves a live reference to an object by its integer ID.
     *
     * The returned [`Object`] is **owned by the world** — do not manually
     * destroy it on the JS side, and do not retain it across calls to
     * [`World::delete`] with the same ID.
     */
    get_object(id: number): VertraObject | undefined;
    /**
     * Returns the integer IDs of all root-level objects.
     */
    get_roots(): Uint32Array;
    /**
     * Registers a callback fired whenever the scene graph changes structurally
     * (object added, deleted, or re-parented).
     *
     * Pass `undefined` / `null` to unregister a previously set callback.
     *
     * Callback signature: `(event: SceneGraphModifiedEvent) => void`
     */
    on_scene_graph_modified(f?: Function | null): void;
    /**
     * Renames the stable string identifier of a live world object.
     *
     * When called **inside a script callback** the rename is deferred.
     *
     * # Returns
     *
     * `true` if the rename succeeded; `false` when `id` does not exist.
     */
    rename_str_id(id: number, new_str_id: string): boolean;
    /**
     * Moves an object to a new parent in the scene hierarchy.
     *
     * When called **inside a script callback** the reparent is deferred.
     * `true` is returned optimistically; the actual outcome is determined
     * when the mutation is flushed after the callback.
     *
     * # Arguments
     *
     * * `id`            - Integer ID of the object to move.
     * * `new_parent_id` - ID of the new parent, or `undefined` / `null` for root.
     *
     * # Returns
     *
     * `true` if the reparent was applied; `false` if it was rejected.
     */
    reparent(id: number, new_parent_id?: number | null): boolean;
    /**
     * Spawns an object into the world, optionally as a child of an existing
     * object.
     *
     * When called **inside a script callback** the spawn is deferred until
     * the callback returns; the returned ID is pre-allocated and will be
     * valid immediately after the callback.  Sequential deferred spawns
     * receive sequential IDs.
     *
     * # Arguments
     *
     * * `object`    - The template object to clone into the world.
     * * `parent_id` - ID of the parent object.  Pass `undefined` / `null` to
     *   add the object at the scene root.
     *
     * # Returns
     *
     * The unique integer ID assigned to the new object instance.
     */
    spawn_object(object: VertraObject, parent_id?: number | null): number;
}

export function main_js(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_jsscript_free: (a: number, b: number) => void;
    readonly wasmscript_new: (a: any) => number;
    readonly __wbg_world_free: (a: number, b: number) => void;
    readonly world_delete: (a: number, b: number) => void;
    readonly world_get_id: (a: number, b: number, c: number) => number;
    readonly world_get_object: (a: number, b: number) => number;
    readonly world_get_roots: (a: number) => [number, number];
    readonly world_on_scene_graph_modified: (a: number, b: number) => void;
    readonly world_rename_str_id: (a: number, b: number, c: number, d: number) => number;
    readonly world_reparent: (a: number, b: number, c: number) => number;
    readonly world_spawn_object: (a: number, b: number, c: number) => number;
    readonly __wbg_editor_free: (a: number, b: number) => void;
    readonly editor_clear_inspector: (a: number) => void;
    readonly editor_clear_selection: (a: number) => void;
    readonly editor_editor_event: (a: number, b: any) => [number, number];
    readonly editor_get_pivot: (a: number) => any;
    readonly editor_group_ids: (a: number) => [number, number];
    readonly editor_inspector: (a: number) => any;
    readonly editor_is_editor_mode: (a: number) => number;
    readonly editor_is_multi_selected: (a: number, b: number) => number;
    readonly editor_is_play_mode: (a: number) => number;
    readonly editor_mode: (a: number) => [number, number];
    readonly editor_multi_selected_ids: (a: number) => [number, number];
    readonly editor_set_camera_speed: (a: number, b: number) => void;
    readonly editor_set_multi_selected: (a: number, b: number, c: number) => void;
    readonly editor_set_pivot: (a: number, b: number, c: number, d: number) => void;
    readonly __wbg_scene_free: (a: number, b: number) => void;
    readonly scene_attach_script: (a: number, b: number, c: number) => void;
    readonly scene_camera: (a: number) => number;
    readonly scene_detach_script: (a: number, b: number) => number;
    readonly scene_disable_editor_mode: (a: number) => void;
    readonly scene_editor: (a: number) => number;
    readonly scene_enable_editor_mode: (a: number) => void;
    readonly scene_has_script: (a: number, b: number) => number;
    readonly scene_has_texture: (a: number, b: number, c: number) => number;
    readonly scene_is_editor_mode: (a: number) => number;
    readonly scene_load_texture_from_rgba: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly scene_load_vtr: (a: number, b: number, c: number) => [number, number];
    readonly scene_save_vtr: (a: number) => [number, number, number, number];
    readonly scene_spawn: (a: number, b: number, c: number) => number;
    readonly scene_unload_texture: (a: number, b: number, c: number) => number;
    readonly scene_world: (a: number) => number;
    readonly __wbg_camera_free: (a: number, b: number) => void;
    readonly __wbg_transform_free: (a: number, b: number) => void;
    readonly camera_handle_input_default: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly camera_move_by: (a: number, b: number, c: number, d: number) => [number, number];
    readonly camera_new: (a: any) => number;
    readonly camera_rotate: (a: number, b: number, c: number, d: number) => void;
    readonly camera_set_aspect: (a: number, b: number) => void;
    readonly transform_combine_wasm: (a: number, b: number) => number;
    readonly transform_new: (a: any) => number;
    readonly transform_position: (a: number) => [number, number];
    readonly transform_rotation: (a: number) => [number, number];
    readonly transform_scale: (a: number) => [number, number];
    readonly transform_set_position: (a: number, b: number, c: number) => void;
    readonly transform_set_rotation: (a: number, b: number, c: number) => void;
    readonly transform_set_scale: (a: number, b: number, c: number) => void;
    readonly __wbg_framecontext_free: (a: number, b: number) => void;
    readonly __wbg_geometry_free: (a: number, b: number) => void;
    readonly __wbg_get_framecontext_dt: (a: number) => number;
    readonly __wbg_set_framecontext_dt: (a: number, b: number) => void;
    readonly __wbg_vertraobject_free: (a: number, b: number) => void;
    readonly __wbg_webwindow_free: (a: number, b: number) => void;
    readonly geometry_box: (a: number, b: number, c: number) => number;
    readonly geometry_cube: (a: number) => number;
    readonly geometry_plane: (a: number) => number;
    readonly geometry_pyramid: (a: number, b: number) => number;
    readonly geometry_sphere: (a: number, b: number) => number;
    readonly object_children: (a: number) => [number, number];
    readonly object_children_count: (a: number) => number;
    readonly object_name: (a: number) => [number, number];
    readonly object_new: (a: number, b: number, c: number) => number;
    readonly object_parent: (a: number) => number;
    readonly object_set_color: (a: number, b: number, c: number) => void;
    readonly object_set_geometry: (a: number, b: number) => void;
    readonly object_set_name: (a: number, b: number, c: number) => void;
    readonly object_set_str_id: (a: number, b: number, c: number) => void;
    readonly object_set_texture_path: (a: number, b: number, c: number) => void;
    readonly object_set_transform: (a: number, b: number) => void;
    readonly object_str_id: (a: number) => [number, number];
    readonly object_texture_path: (a: number) => [number, number];
    readonly object_transform: (a: number) => number;
    readonly webwindow_new: (a: number, b: number) => number;
    readonly webwindow_on_draw_request: (a: number, b: any) => void;
    readonly webwindow_on_editor_event: (a: number, b: any) => void;
    readonly webwindow_on_startup: (a: number, b: any) => void;
    readonly webwindow_on_update: (a: number, b: any) => void;
    readonly webwindow_start: (a: number, b: number, c: number) => void;
    readonly webwindow_with_event_handler: (a: number, b: any) => void;
    readonly main_js: () => void;
    readonly wasm_bindgen__convert__closures_____invoke__h6e218faabae865be: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__hbe68fcdbb9ed28f8: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h2429a9f9595891cb: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h568f75eb71d01c31: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02_5: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h568f75eb71d01c31_6: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02_7: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02_8: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02_9: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h088dea6ac3c12d02_10: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h6243cd57395b9938: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
