export function setConfig(config) {
    global._astroTypstConfig = config;
}
export function getConfig() {
    const c = global._astroTypstConfig;
    if (!c) {
        throw new Error("Config not set");
    }
    return c;
}
export function setAstroConfig(config) {
    global._astroConfig = config;
}
export function getAstroConfig() {
    const c = global._astroConfig;
    if (!c) {
        throw new Error("Config not set");
    }
    return c;
}
//# sourceMappingURL=store.js.map