const logger = {
    debug(...args) {
        process.env.ASTRO_TYPST && console.debug(...args);
    },
    error(message) {
        console.error("\x1b[41m[astro-typst]\x1b[0m \x1b[31m" + message + "\x1b[0m");
    },
    compileError(...args) {
        console.error("\x1b[41m\x1b[37m [astro-typst] \x1b[0m \x1b[31m", ...args, "\x1b[0m");
    },
};
export default logger;
//# sourceMappingURL=logger.js.map