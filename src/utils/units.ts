const UNITS = ['cm', 'in'] as const;

type Units = (typeof UNITS)[number];

export type UnitsNumber = `${number}${Units}`;

const unitsExp = new RegExp(`^([0-9]+(?:\.[0-9]+)?)(${UNITS.join('|')})$`);

export const parseUnits = (str: UnitsNumber) => {
  const result = str.match(unitsExp) as [never, string, Units];
  if (!result) {
    throw new TypeError(`Invalid unit value "${str}".`);
  }
  return [parseFloat(result[1]), result[2]] as const;
};

export const toUnits = (value: number, units: Units): UnitsNumber => {
  if (!UNITS.includes(units)) {
    throw new TypeError(`Invalid units "${units}".`);
  }
  return `${value}${units}`;
};

export const mathUnits = (
  method: 'add' | 'subtract' | 'multiply',
  str1: UnitsNumber,
  str2: number | UnitsNumber,
) => {
  const [value1, units1] = parseUnits(str1);
  const [value2, units2] =
    typeof str2 === 'number' ? [str2, units1] : parseUnits(str2);
  if (units1 !== units2) {
    throw new TypeError(`Cannot add units ${units1} and ${units2}.`);
  }
  if (method === 'add') {
    return toUnits(value1 + value2, units2);
  }
  if (method === 'subtract') {
    return toUnits(value1 - value2, units2);
  }
  if (method === 'multiply') {
    return toUnits(value1 * value2, units2);
  }
  throw new TypeError(`Invalid math method "${method}".`);
};
