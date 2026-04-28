/**
 * Default Vertra engine script loaded into new projects.
 *
 * The script body is executed with the following globals injected:
 *   VertraObject, Geometry, Transform, Camera
 *
 * It must return an object with:
 *   { initialState, onStartup?, onUpdate?, onEvent? }
 */
export const DEFAULT_ENGINE_SCRIPT = `// Vertra Engine Script
// Globals available: VertraObject, Geometry, Transform, Camera
//
// Return an object with your handlers below.

return {
  // Mutable state passed to every callback — put your game state here.
  initialState: {
    pressedKeys: new Set(),
    angle: 0,
  },

  onStartup(state, scene) { },

  onUpdate(state, scene, ctx) {
    // Camera movement with WASD / arrow keys
    scene.camera.handle_input_default(
      Array.from(state.pressedKeys),
      3.0,
      ctx.dt,
    );
  },

  onEvent(state, scene, event) {
    if (event.type === "keydown") state.pressedKeys.add(event.data.code);
    if (event.type === "keyup")   state.pressedKeys.delete(event.data.code);
    if (event.type === "mousemotion") {
      scene.camera.rotate(event.data.dx * 0.1, event.data.dy * 0.1, false);
    }
  },
};
`;
