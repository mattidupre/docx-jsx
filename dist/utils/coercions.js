// TODO: create asObjectOf, add mapKeys, mapValues option
const parseOptions = (options) => ({
    undefinable: false,
    min: 0,
    max: Infinity,
    typeName: 'type',
    ...options,
});
const asArray = (value) => (value === undefined
    ? []
    : Array.isArray(value)
        ? value
        : [value]);
const asUndefinable = (value, { undefinable, typeName }) => {
    if (undefinable !== true && value === undefined) {
        throw new Error(`Expected ${typeName} to not be undefined.`);
    }
    return value;
};
const asOfLength = (value, { min = 0, max = Infinity, typeName }) => {
    if (min >= 0 && value.length < min) {
        throw new Error(`Expected ${typeName} to have ${min === 0
            ? 'a defined value'
            : min === 1
                ? 'at least one value'
                : `at least ${min} values.`}.`);
    }
    if (max >= 0 && value.length > max) {
        throw new Error(max === 0
            ? `Expected ${typeName} to be an empty array.`
            : `Expected ${typeName} to have no more than ${max} value${max === 1 ? 's' : ''}.`);
    }
};
export const asFlatOf = (value, options = {}) => {
    const parsedOptions = parseOptions(options);
    asUndefinable(value, parsedOptions);
    const [flatValue] = asArray(value);
    asUndefinable(flatValue, parsedOptions);
    return flatValue;
};
export const asArrayOf = (value, options = {}) => {
    const parsedOptions = parseOptions(options);
    asUndefinable(value, parsedOptions);
    const arr = asArray(value);
    asOfLength(arr, parsedOptions);
    return arr;
};
//# sourceMappingURL=coercions.js.map