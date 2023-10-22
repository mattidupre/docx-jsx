export const SCHEMA = {
    document: {
        children: ['pagesGroup'],
    },
    pagesGroup: {
        children: ['paragraph', 'table'],
        headers: {
            default: 'header',
            even: 'header',
            odd: 'header',
            first: 'header',
        },
        footers: {
            default: 'header',
            even: 'header',
            odd: 'header',
            first: 'header',
        },
    },
    header: { children: ['header'] },
    footer: { children: ['footer'] },
    paragraph: { children: ['textrun'] },
    textrun: { children: ['textrun'] },
    table: {},
};
//# sourceMappingURL=schema.js.map