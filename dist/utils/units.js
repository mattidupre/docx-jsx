const UNITS = ['cm', 'in'];
const unitsExp = new RegExp(`^([0-9]+(?:\.[0-9]+)?)(${UNITS.join('|')})$`);
export const parseUnits = (str) => {
    const result = str.match(unitsExp);
    if (!result) {
        throw new TypeError(`Invalid unit value "${str}".`);
    }
    return [parseFloat(result[1]), result[2]];
};
export const toUnits = (value, units) => {
    if (!UNITS.includes(units)) {
        throw new TypeError(`Invalid units "${units}".`);
    }
    return `${value}${units}`;
};
export const mathUnits = (method, str1, str2) => {
    const [value1, units1] = parseUnits(str1);
    const [value2, units2] = parseUnits(str2);
    if (units1 !== units2) {
        throw new TypeError(`Cannot add units ${units1} and ${units2}.`);
    }
    if (method === 'add') {
        return toUnits(value1 + value2, units2);
    }
    if (method === 'subtract') {
        return toUnits(value1 - value2, units2);
    }
    throw new TypeError(`Invalid math method "${method}".`);
};
//# sourceMappingURL=units.js.map