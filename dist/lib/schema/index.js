const schema = (obj) => obj;
const value = (options) => ({
    __schemaEntry: true,
    options,
});
export const SCHEMA = {
    document: {
        children: ['pagesGroup'],
    },
    pagesGroup: {
        headers: {
            default: 'header',
            even: 'header',
            odd: 'header',
            first: 'header',
        },
        children: ['paragraph', 'table'],
        footers: {
            default: 'header',
            even: 'header',
            odd: 'header',
            first: 'header',
        },
    },
    header: { children: ['paragraph', 'table'] },
    footer: { children: ['paragraph', 'table'] },
    paragraph: { children: ['textrun'] },
    textrun: { children: ['textrun'] },
    table: {},
};
//# sourceMappingURL=index.js.map