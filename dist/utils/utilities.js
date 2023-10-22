export const asArray = (value) => (Array.isArray(value) ? value : [value]);
export const parseOverArray = (subject, callback) => asArray(subject).reduce((arr, value, index) => {
    const result = callback(value, index, arr);
    if (result !== undefined) {
        arr.push(result);
    }
    return arr;
}, []);
export const isObject = (value) => typeof value === 'object' && !Array.isArray(value) && value !== null;
export const omitFromObject = (obj, key) => {
    const { [key]: omitted, ...rest } = obj;
    return rest;
};
export const mapObjectValues = (obj, callback) => Object.fromEntries(Object.entries(obj).map(([key, value]) => [
    key,
    callback(key, value, obj),
]));
export const mapObjectKeys = (obj, callback) => Object.fromEntries(Object.entries(obj).map(([key, value]) => [
    callback(key, value, obj),
    value,
]));
export const mapObjectEntries = (obj, callback) => Object.entries(obj).reduce((thisObj, [key, value]) => {
    const entry = callback(key, value, obj);
    if (entry) {
        // eslint-disable-next-line prefer-destructuring, no-param-reassign
        thisObj[entry[0]] = entry[1];
    }
    return thisObj;
}, {});
//# sourceMappingURL=utilities.js.map