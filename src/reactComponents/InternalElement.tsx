import { type ReactNode, createElement, useMemo } from 'react';
import { compact } from 'lodash';
import {
  elementTypeToClassName,
  encodeElementData,
  variantNameToClassName,
} from '../entities';
import type {
  TypographyOptions,
  ElementData,
  TagName,
  VariantName,
} from '../entities';
import {
  resolveStyleRemLengths,
  typographyOptionsToStyleVars,
} from '../lib/styles';
import type { ExtendableProps } from './entities';
import { useEnvironment } from './useEnvironment';
import { usePrefixes } from './usePrefixes';

type InternalElementProps = ExtendableProps & {
  preferFragment?: boolean;
  elementType: ElementData['elementType'];
  elementOptions?: ElementData['elementOptions'];
  variant?: VariantName;
  typography?: TypographyOptions;
  children?: ReactNode;
  tagName: TagName;
  htmlAttributes?: Record<string, any>;
};

/**
 * Encodes component styles and options to the DOM.
 */
export function InternalElement({
  preferFragment,
  elementType,
  elementOptions = {},
  typography: contentOptions,
  variant,
  tagName,
  htmlAttributes = {},
  className: classNameProp,
  style: styleProp,
  children,
}: InternalElementProps) {
  const isWeb = useEnvironment({ disableAssert: true }).documentType === 'web';

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

  const classNames = compact([
    classNameProp,
    // A stable hook for a consumer's own CSS: the element type never changes,
    // where the tag a component renders is an implementation detail.
    elementTypeToClassName({ prefixes }, elementType),
    variant && variantNameToClassName({ prefixes }, variant),
  ]);

  const baseAttributes = {
    ...htmlAttributes,
    className: classNames.length > 0 ? classNames.join(' ') : undefined,
    // Components compute their inline styles from lengths the author wrote,
    // so a `rem` gap or height is resolved here once for all of them.
    style: resolveStyleRemLengths({
      ...optionsStyle,
      ...styleProp,
    }),
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
