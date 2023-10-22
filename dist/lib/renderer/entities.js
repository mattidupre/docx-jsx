export const isAnyElement = (value) => {
    return value?.type !== undefined;
};
export const isIntrinsicElement = (value, allowTypes) => {
    if (!isAnyElement(value)) {
        return false;
    }
    if (typeof value.type !== 'string') {
        return false;
    }
    if (allowTypes === undefined) {
        return true;
    }
    if (!allowTypes.includes(value.type)) {
        throw new TypeError(`Expected ${value?.type ?? value} to be Intrinsic Element of type ${allowTypes.join(' or ')}.`);
    }
    return true;
};
export function assertIntrinsicElement(value, allowTypes) {
    if (!isIntrinsicElement(value, allowTypes)) {
        throw new TypeError(`Invalid intrinsic element "${value?.type ?? value}".`);
    }
}
export const asIntrinsicElement = (value, allowTypes) => {
    assertIntrinsicElement(value, allowTypes);
    return value;
};
export const isComponentElement = (value) => isAnyElement(value) && typeof value.type === 'function';
//# sourceMappingURL=entities.js.map