import { capitalize } from 'lodash';
import { indexesOf, joinArrayStrings } from './array';
import { getSubOrSelf } from './object';

export type FontWeight = number | `${number}` | 'normal' | 'bold';

export type FontStyle = 'normal' | 'italic' | 'oblique';

export type FontFaceOptions = {
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
};

export const fontWeightToInteger = (
  fontWeight: undefined | FontWeight | Pick<FontFaceOptions, 'fontWeight'>,
): number => {
  const weight = getSubOrSelf('fontWeight', fontWeight);

  if (weight === undefined || weight === 'normal') {
    return 400;
  }
  if (weight === 'bold') {
    return 700;
  }
  const fontWeightInteger = Number.parseInt(weight as string, 10);
  if (
    isNaN(fontWeightInteger) ||
    fontWeightInteger < 1 ||
    fontWeightInteger > 1000
  ) {
    throw new TypeError(`Invalid font weight ${fontWeight}`);
  }
  return fontWeightInteger;
};

export const fontStyleToString = (
  fontStyle: undefined | FontStyle | Pick<FontFaceOptions, 'fontStyle'>,
): FontStyle => getSubOrSelf('fontStyle', fontStyle) ?? 'normal';

export const isFontWeightBoldish = (
  fontWeight: undefined | FontWeight | Pick<FontFaceOptions, 'fontWeight'>,
) => {
  const weight = getSubOrSelf('fontWeight', fontWeight);
  return fontWeightToInteger(weight) > 500;
};

export const createFontFaceName = (
  fontFamily: string,
  { fontWeight, fontStyle = 'normal' }: FontFaceOptions,
) => {
  const fontWeightInteger = fontWeightToInteger(fontWeight);
  return joinArrayStrings(
    [
      fontFamily,
      fontWeightInteger === 400 ? 'Regular' : fontWeightInteger,
      fontStyle === 'normal' ? undefined : capitalize(fontStyle),
    ],
    '-',
  );
};

export const isFontStyleItalicish = (
  fontStyle: undefined | FontStyle | Pick<FontFaceOptions, 'fontStyle'>,
) => {
  const style = getSubOrSelf('fontStyle', fontStyle);
  return style === 'italic' || style === 'oblique';
};

// See https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#fallback_weights
export const getMatchedFontWeightIndexes = (
  fontWeight: undefined | FontWeight | Pick<FontFaceOptions, 'fontWeight'>,
  fontWeights: ReadonlyArray<
    undefined | FontWeight | Pick<FontFaceOptions, 'fontWeight'>
  >,
): ReadonlyArray<number> => {
  const matchedIndexes: ReadonlyArray<number> = [];
  if (!fontWeights.length) {
    return matchedIndexes;
  }
  const weight = fontWeightToInteger(fontWeight);
  const weights = fontWeights.map(fontWeightToInteger);
  const weightsSorted = [...weights].sort((a, b) => a - b);
  const parseResult = (value: number) => {
    return indexesOf(weights, value).sort((a, b) => a - b);
  };

  // If a weight less than 400 is given
  if (weight < 400) {
    // look for available weights less than the target, in descending order.
    for (let index = weights.length - 1; index >= 0; index -= 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight <= weight) {
        return parseResult(thisWeight);
      }
    }

    // If no match is found, look for available weights greater than the target, in ascending order.
    for (let index = 0; index < weights.length; index += 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight >= weight) {
        return parseResult(thisWeight);
      }
    }

    // If the target weight given is between 400 and 500 inclusive
  } else if (weight >= 400 && weight <= 500) {
    // Look for available weights between the target and 500, in ascending order.
    for (let index = 0; index < weights.length; index += 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight > 500) {
        break;
      }
      if (thisWeight >= weight) {
        return parseResult(thisWeight);
      }
    }

    // If no match is found, look for available weights less than the target, in descending order.
    for (let index = weights.length - 1; index >= 0; index -= 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight <= weight) {
        return parseResult(thisWeight);
      }
    }

    // If no match is found, look for available weights greater than 500, in ascending order.
    for (let index = 0; index < weights.length; index += 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight >= weight) {
        return parseResult(thisWeight);
      }
    }

    // If a weight greater than 500 is given
  } else if (weight > 500) {
    // look for available weights greater than the target, in ascending order.
    for (let index = 0; index < weights.length; index += 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight >= weight) {
        return parseResult(thisWeight);
      }
    }

    // If no match is found, look for available weights less than the target, in descending order.
    for (let index = weights.length - 1; index >= 0; index -= 1) {
      const thisWeight = weightsSorted[index];
      if (thisWeight <= weight) {
        return parseResult(thisWeight);
      }
    }
  }

  throw new Error(`Could not find font weight ${fontWeight} in ${fontWeights}`);
};

/**
 * Given an array of fonts, find the closest match.
 * Follows the CSS matching algorithm, but only with regard to
 * font-weight and normal / italic / oblique.
 */
export const matchFontFace = <TFont extends FontFaceOptions>(
  fontFaces: ReadonlyArray<TFont>,
  fontFace: FontFaceOptions,
): undefined | TFont => {
  if (!fontFaces.length) {
    return undefined;
  }
  const remainingFontFaces = fontFaces.slice();
  let defaultMatch: undefined | TFont = undefined;
  let italicishMatch: undefined | TFont = undefined;
  for (let i = 0; remainingFontFaces.length > 0; i += 1) {
    // Get closest font weight match.
    const matchedFontWeightIndexes = getMatchedFontWeightIndexes(
      fontFace,
      remainingFontFaces,
    );

    // All out of potential exact matches. Return the next best option.
    if (matchedFontWeightIndexes.length === 0) {
      return defaultMatch;
    }

    // Iterate over potential matches and check fontStyle.
    for (const matchedIndex of matchedFontWeightIndexes) {
      const thisFont = remainingFontFaces[matchedIndex];

      if (
        fontStyleToString(thisFont.fontStyle) ===
        fontStyleToString(fontFace.fontStyle)
      ) {
        // Exact match. Break all.
        return thisFont;
      }

      // set default match to first match.
      if (!defaultMatch) {
        defaultMatch ??= thisFont;
      }

      // set next best match to first match.
      if (
        !italicishMatch &&
        isFontStyleItalicish(fontFace) === isFontStyleItalicish(thisFont)
      ) {
        italicishMatch = thisFont;
      }
    }

    // Remove the fonts from the cloned array for the next run.
    for (const matchedIndex of matchedFontWeightIndexes) {
      remainingFontFaces.splice(matchedIndex, 1);
    }
  }

  return italicishMatch ?? defaultMatch;
};
