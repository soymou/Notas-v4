import { NodeCompiler, DynLayoutCompiler, type CompileDocArgs, type NodeTypstDocument } from "@myriaddreamin/typst-ts-node-compiler";
import type { AstroTypstRenderOption, TypstDocInput } from "./prelude.js";
export declare function getOrInitCompiler(): NodeCompiler;
export declare function getOrInitDynCompiler(): DynLayoutCompiler;
export declare function getFrontmatter($typst: NodeCompiler, source: NodeTypstDocument | CompileDocArgs): Record<string, any>;
/**
 * @param source The source code of the .typ file.
 * @param options Options for rendering the SVG.
 * @returns The SVG string.
 */
export declare function renderToSVGString(source: TypstDocInput, options: AstroTypstRenderOption | undefined): Promise<{
    svg: string;
    frontmatter: () => Record<string, any>;
}>;
export declare function renderToVectorFormat(source: TypstDocInput, options: any): Promise<{
    vector: Buffer<ArrayBufferLike>;
}>;
export declare function renderToDynamicLayout(source: TypstDocInput, options: any): Promise<Buffer<ArrayBufferLike>>;
/**
 * @param source The source code of the .typ file.
 * @param options Options for rendering the HTML.
 * @returns The HTML string.
 */
export declare function renderToHTML(source: TypstDocInput & {
    body?: boolean | "hast";
}, options: any): Promise<{
    html: string;
    frontmatter?: undefined;
} | {
    html: any;
    frontmatter: () => Record<string, any>;
}>;
/**
 * @deprecated Need to be removed
 */
export declare function renderToHast(source: TypstDocInput & {
    body?: boolean;
}, options: any): Promise<{
    html: string;
    frontmatter?: undefined;
} | {
    html: any;
    frontmatter: () => Record<string, any>;
}>;
export declare function renderToHTMLish(source: TypstDocInput & {
    body?: boolean | "hast";
}, options: Record<string, any> | undefined, isHtml?: boolean): Promise<{
    html: string;
    getFrontmatter: () => {};
}>;
//# sourceMappingURL=typst.d.ts.map