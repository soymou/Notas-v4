import type { AstroIntegration, AstroRenderer } from "astro";
import { type AstroTypstConfig } from "./prelude.js";
declare function getRenderer(): AstroRenderer;
export declare const getContainerRenderer: typeof getRenderer;
export default function typstIntegration(config?: AstroTypstConfig): AstroIntegration;
export {};
//# sourceMappingURL=integration.d.ts.map