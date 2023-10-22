export const createParser = (renderType) => {
    if (renderType === 'docx') {
        return (options, renderContext) => DOCX_PARSERS[renderContext.type](options, renderContext);
    }
    if (renderType === 'html') {
        return (options, renderContext) => {
            return HTML_PARSERS[renderContext.type](options, renderContext);
        };
    }
    if (renderType === 'ast') {
        return (options, renderContext) => {
            return AST_PARSERS[renderContext.type](options, renderContext);
        };
    }
    throw new TypeError('Invalid parser type.');
};
//# sourceMappingURL=createParser.js.map