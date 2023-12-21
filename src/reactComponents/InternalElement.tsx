import { type ReactNode, createElement, useMemo, useContext } from 'react';
import { compact } from 'lodash-es';
import { encodeElementData } from '../entities';
import type {
  ContentOptions,
  ElementData,
  TagName,
  VariantName,
} from '../entities';
import { optionsToCssVars, variantNameToClassName } from '../lib/toCss.js';
import type { ExtendableProps } from './entities.js';
import { ReactDocumentContext } from './entities.js';
import { useEnvironment } from './useEnvironment.js';

type InternalElementProps = ExtendableProps & {
  preferFragment?: boolean;
  elementType: ElementData['elementType'];
  elementOptions: ElementData['elementOptions'];
  variant?: VariantName;
  contentOptions?: ContentOptions;
  children?: ReactNode;
  tagName: TagName;
};

export function InternalElement({
  preferFragment,
  elementType,
  elementOptions,
  contentOptions,
  variant,
  tagName,
  className: classNameProp,
  style: styleProp,
  children,
}: InternalElementProps) {
  const isWeb = useEnvironment().documentType === 'web';

  const isFragment = preferFragment && isWeb;

  const { prefixes } = useContext(ReactDocumentContext)!;

  const optionsStyle = useMemo(
    () => ({
      ...(isWeb &&
        !isFragment &&
        optionsToCssVars({ prefixes }, contentOptions)),
    }),
    [contentOptions, isFragment, isWeb, prefixes],
  );

  if (isFragment) {
    return children;
  }

  const baseAttributes = {
    className: compact([
      classNameProp,
      variantNameToClassName({ prefixes }, variant),
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
