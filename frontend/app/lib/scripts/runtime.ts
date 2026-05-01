type ScriptRuntimeTabs = {
  on_startup: string;
  on_update: string;
  on_event: string;
};

/**
 * Strip TypeScript type annotations from a script body so it can be executed
 * by the engine runtime. Handles the simple patterns users write
 * in Vertra scripts: parameter types and return type annotations.
 *
 * Only strips annotations where the type is a known TS primitive keyword or
 * starts with an uppercase letter (PascalCase class/interface names). This
 * prevents accidental stripping of object literal properties like `angle: 0`.
 */
const TS_TYPE_PATTERN =
  /(?:number|string|boolean|void|unknown|never|any|object|null|undefined)(?:\[\])*|[A-Z]\w*(?:<[^>]*>)?(?:\[\])*/;

export function stripTypeAnnotations(code: string): string {
  return code
    // Remove return type annotations: ): void { or ): World {
    .replace(
      new RegExp(`\\)\\s*:\\s*(?:${TS_TYPE_PATTERN.source})\\s*(?=\\{)`, 'g'),
      ') ',
    )
    // Remove parameter type annotations: param: number or param: World
    // Lookahead only , or ) to avoid touching object literal properties.
    .replace(
      new RegExp(`(\\w+\\??)\\s*:\\s*(?:${TS_TYPE_PATTERN.source})(?=\\s*[,)])`, 'g'),
      '$1',
    );
}

/** Compose all three tab bodies into a single script body for JsScript. */
export function composeScript(tabs: ScriptRuntimeTabs): string {
  return [
    tabs.on_startup,
    tabs.on_update,
    tabs.on_event,
    'return new JsScript({ on_start: on_startup, on_update });',
  ].join('\n\n');
}