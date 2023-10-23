const ENTRY_KEY = Symbol('Schema entry key');
const createEntry = (meta) => ({
    [ENTRY_KEY]: meta,
});
const entries = {
    String: {
        define: (options = { undefinable: false }) => createEntry({ ...options, type: 'String', data: {} }),
        check: (value) => typeof value === 'string',
    },
    Number: {
        define: (options = { undefinable: false }) => createEntry({ ...options, type: 'Number', data: {} }),
        check: (value) => typeof value === 'number',
    },
    Object: {
        define: (object, options = { undefinable: false }) => createEntry({ ...options, type: 'Object', data: { object } }),
        check: (value) => typeof value !== 'object' ||
            typeof value === null ||
            Array.isArray(value),
        map: (value, callback) => Object.fromEntries(Object.entries(value).map(([key, value]) => [
            key,
            callback(value, key),
        ])),
    },
    Array: {
        define: (array, options = { undefinable: false }) => createEntry({ ...options, type: 'Object', data: { array } }),
        check: (value) => typeof value !== 'object' ||
            typeof value === null ||
            Array.isArray(value),
        map: ({ array }, callback) => array.map((value, index) => callback(value, index)),
    },
    Union: {
        define: (array, options = { undefinable: false }) => createEntry({ ...options, type: 'Object', data: { array } }),
        check: (value) => typeof value !== 'object' ||
            typeof value === null ||
            Array.isArray(value),
    },
    Child: {
        define: (types, options = { undefinable: false }) => createEntry({ ...options, type: 'Child', data: { types } }),
    },
    Children: {
        define: (types, options = { undefinable: false }) => createEntry({ ...options, type: 'Children', data: { types } }),
    },
};
export const SCHEMA = {
    document: {
        temp: T.String(),
        children: T.Children(['pagesGroup']),
    },
    pagesGroup: {
        headers: {
            default: T.Child(['header']),
            even: T.Child(['header']),
            odd: T.Child(['header']),
            first: T.Child(['header']),
        },
        children: T.Children(['paragraph', 'table']),
        footers: {
            default: T.Child(['footer']),
            even: T.Child(['footer']),
            odd: T.Child(['footer']),
            first: T.Child(['footer']),
        },
    },
    header: {
        children: T.Children(['paragraph', 'table']),
    },
    footer: {
        children: T.Children(['paragraph', 'table']),
    },
    paragraph: {
        children: T.Children(['textrun']),
    },
    textrun: {
        children: T.Children(['textrun']),
    },
    table: {},
};
const parse = (values, handleChild) => { };
//# sourceMappingURL=schema_temp.js.map