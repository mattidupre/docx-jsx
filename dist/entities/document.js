export const PAGE_TYPES = ['default', 'even', 'odd', 'first'];
export function assertPageType(value) {
    if (!PAGE_TYPES.includes(value)) {
        throw new TypeError(`Invalid Page Type "${value}".`);
    }
}
export const mapPageTypes = (obj, fn) => Object.fromEntries(PAGE_TYPES.map((pageType) => [pageType, fn(pageType, obj[pageType])]));
const DEFAULT_PAGE_OPTIONS = {
    width: '8.5in',
    height: '11in',
    marginTop: '0.5in',
    marginRight: '0.5in',
    marginBottom: '0.5in',
    marginLeft: '0.5in',
    headerHtml: false,
    footerHtml: false,
};
const PAGE_OPTIONS_KEYS = Object.keys(DEFAULT_PAGE_OPTIONS);
const extendPageOptions = (...optionsObjects) => {
    optionsObjects.reverse();
    return Object.fromEntries(PAGE_OPTIONS_KEYS.map((key) => [
        key,
        optionsObjects.find((obj) => obj?.[key] && obj[key] !== false && obj[key] !== null)?.[key],
    ]));
};
export const parsePageTypes = (pageTypes = {}) => {
    const defaultOptions = extendPageOptions(DEFAULT_PAGE_OPTIONS, pageTypes.default);
    return Object.fromEntries(PAGE_TYPES.map((pageType) => [
        pageType,
        pageType === 'default'
            ? defaultOptions
            : extendPageOptions(defaultOptions, pageTypes[pageType]),
    ]));
};
//# sourceMappingURL=document.js.map