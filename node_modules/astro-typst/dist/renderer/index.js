import { AstroError } from "astro/errors";
import { AstroJSX, jsx } from "astro/jsx-runtime";
import { renderJSX } from "astro/runtime/server/index.js";
const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
export async function check(Component, props, { default: children = null, ...slotted } = {}) {
    if (typeof Component !== 'function')
        return false;
    // console.log('check', { Component: Component, props, children, t, name: t?.name });
    const slots = {};
    for (const [key, value] of Object.entries(slotted)) {
        const name = slotName(key);
        slots[name] = value;
    }
    try {
        const result = await Component({ ...props, ...slots, children });
        return result[AstroJSX];
    }
    catch (e) {
        throwEnhancedErrorIfTypComponent(e, Component);
        return false;
    }
}
export async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
    const slots = {};
    for (const [key, value] of Object.entries(slotted)) {
        const name = slotName(key);
        slots[name] = value;
    }
    // @ts-ignore
    const { result } = this;
    try {
        // console.log('renderToStaticMarkup', {
        //   result,
        //   component: String(Component),
        //   props,
        //   slots,
        //   children,
        //   jsx: jsx(Component, { ...props, ...slots, children })
        // });
        const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
        return { html };
    }
    catch (e) {
        throwEnhancedErrorIfTypComponent(e, Component);
        throw e;
    }
}
const renderer = {
    name: 'astro:jsx',
    check,
    renderToStaticMarkup,
    supportsAstroStaticSlot: true,
};
function throwEnhancedErrorIfTypComponent(error, Component) {
    if (Component[Symbol.for('astro-component')]) {
        // if it's an existing AstroError, we don't need to re-throw, keep the original hint
        if (AstroError.is(error))
            return;
        // Provide better title and hint for the error overlay
        error.title = error.name;
        error.hint =
            `This issue often occurs when your Typst component encounters runtime errors.`;
        throw error;
    }
}
export default renderer;
//# sourceMappingURL=index.js.map