import type { NamedSSRLoadedRendererValue } from "astro";
export declare function check(Component: any, props: any, { default: children, ...slotted }?: {
    default?: null | undefined;
}): Promise<any>;
export declare function renderToStaticMarkup(Component: any, props?: Record<string, any>, { default: children, ...slotted }?: {
    default?: null | undefined;
}): Promise<{
    html: any;
}>;
declare const renderer: NamedSSRLoadedRendererValue;
export default renderer;
//# sourceMappingURL=index.d.ts.map