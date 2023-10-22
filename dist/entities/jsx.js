import { isValidElement } from 'react';
export const isNullish = (value) => value === null || value === undefined || value === true || value === false;
export const isStringish = (value) => typeof value === 'string' || typeof value === 'number';
export const isIntrinsicElement = (value, allowTypes) => {
    if (!isValidElement(value)) {
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
//# sourceMappingURL=jsx.js.map