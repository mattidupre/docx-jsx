import ColorJs from 'colorjs.io';
import type { Color } from '../../entities';

// TODO: Use lighter submodule of ColorJS.

export const toDocxColor = (
  color: Color | undefined | 'currentColor',
): undefined | string => {
  if (!color || color === 'currentColor') {
    return undefined;
  }
  const hex = new ColorJs(color).to('srgb').display({ format: 'hex' });
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
