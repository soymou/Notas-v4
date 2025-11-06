export function defaultTarget(path) {
    if (path.endsWith('.html.typ') || path.includes('/html/'))
        return "html";
    else if (path.endsWith('.svg.typ') || path.includes('/svg/'))
        return "svg";
    return "html";
}
export async function detectTarget(path, target) {
    if (typeof target === 'function') {
        const result = target(path);
        if (result instanceof Promise)
            return await result;
        return result;
    }
    return target;
}
//# sourceMappingURL=prelude.js.map