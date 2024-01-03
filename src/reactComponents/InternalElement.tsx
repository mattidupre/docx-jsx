import { type ReactNode, createElement, useMemo } from 'react';
import { compact } from 'lodash';
import { encodeElementData } from '../entities';
import type {
  TypographyOptions,
  ElementData,
  TagName,
  VariantName,
} from '../entities';
import {
  typographyOptionsToStyleVars,
  variantNameToClassName,
} from '../lib/styles';
import type { ExtendableProps } from './entities';
import { useEnvironment } from './useEnvironment';
import { usePrefixes } from './usePrefixes';

type InternalElementProps = ExtendableProps & {
  disableInDocumentAssert?: boolean;
  preferFragment?: boolean;
  elementType: ElementData['elementType'];
  elementOptions: ElementData['elementOptions'];
  variant?: VariantName;
  typography?: TypographyOptions;
  children?: ReactNode;
  tagName: TagName;
};

/**
 * Encodes component styles and options to the DOM.
 */
export function InternalElement({
  disableInDocumentAssert,
  preferFragment,
  elementType,
  elementOptions,
  typography: contentOptions,
  variant,
  tagName,
  className: classNameProp,
  style: styleProp,
  children,
}: InternalElementProps) {
  const isWeb =
    useEnvironment({ disableAssert: disableInDocumentAssert }).documentType ===
    'web';

  const isFragment = preferFragment && isWeb;

  const prefixes = usePrefixes();

  const optionsStyle = useMemo(
    () => ({
      ...(isWeb &&
        !isFragment &&
        typographyOptionsToStyleVars({ prefixes }, contentOptions)),
    }),
    [contentOptions, isFragment, isWeb, prefixes],
  );

  if (isFragment) {
    return children;
  }

  const baseAttributes = {
    className: compact([
      classNameProp,
      variant && variantNameToClassName({ prefixes }, variant),
    ]),
    style: {
      ...optionsStyle,
      ...styleProp,
    },
  };

  if (isWeb) {
    return createElement(tagName, baseAttributes, children);
  }

  return createElement(
    tagName,
    {
      ...baseAttributes,
      ...encodeElementData({
        elementType,
        contentOptions,
        elementOptions,
        variant,
      } as ElementData),
    },
    children,
  );
}
