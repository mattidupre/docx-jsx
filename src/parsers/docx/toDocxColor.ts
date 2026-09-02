import ColorJs from 'colorjs.io';
import type { Color } from '../../entities';

// TODO: Use lighter submodule of ColorJS.

type ColorJsColor = {
  to(space: 'srgb'): ColorJsColor;
  display(options: { format: 'hex' }): string;
};

/**
 * colorjs.io 0.4.5 augments its own default export with
 * `declare module './color' { export default class Color { … } }`. A class
 * declaration cannot merge with another class declaration, so the published
 * default export loses its constructor overloads and every instance method,
 * and `new ColorJs(color).to('srgb')` does not type check. Assert the part of
 * the real API used here rather than suppressing the error, so the call site
 * below stays fully checked.
 */
const ColorJsColor = ColorJs as unknown as {
  new (color: string): ColorJsColor;
};

export const toDocxColor = (
  color: Color | undefined | 'currentColor',
): undefined | string => {
  if (!color || color === 'currentColor') {
    return undefined;
  }
  const hex = new ColorJsColor(color).to('srgb').display({ format: 'hex' });
  if (hex.startsWith('#')) {
    const hexBase = hex.slice(1);
    // convert shorthand f00 to ff0000
    // https://github.com/color-js/color.js/issues/266
    if (hexBase.length === 3) {
      return (
        hexBase[0] +
        hexBase[0] +
        hexBase[1] +
        hexBase[1] +
        hexBase[2] +
        hexBase[2]
      );
    }
    if (hexBase.length === 6) {
      return hexBase;
    }
    if (hexBase.length === 8) {
      console.warn(`Transparency value ignored for color ${color}`);
      return hexBase.slice(0, 6);
    }
  }
  throw new TypeError(`Invalid color ${color}`);
};
