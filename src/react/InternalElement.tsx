import { type ReactNode, createElement, useMemo, useContext } from 'react';
import { compact } from 'lodash-es';
import { encodeElementData } from '../entities';
import type { ContentOptions, ElementData, TagName } from '../entities';
import { optionsToCssVars, variantNameToClassName } from '../lib/toCss.js';
import type { ExtendableProps } from './entities.js';
import { ReactDocumentContext } from './entities.js';
import { useTarget } from './useTarget.js';

type InternalElementProps = ElementData &
  ExtendableProps & {
    contentOptions?: ContentOptions;
    elementAttributes?: Record<string, unknown>;
    children?: ReactNode;
    tagName: TagName;
  };

export function InternalElement({
  elementType,
  elementOptions,
  contentOptions,
  elementAttributes,
  tagName,
  className: classNameProp,
  style: styleProp,
  children,
}: InternalElementProps) {
  const target = useTarget();

  const { prefixes } = useContext(ReactDocumentContext)!;

  const optionsStyle = useMemo(
    () => ({
      ...(target === 'web' &&
        optionsToCssVars(
          { prefixes },
          {
            ...contentOptions,
            ...elementOptions.text,
            ...elementOptions.paragraph,
          },
        )),
    }),
    [
      contentOptions,
      elementOptions.paragraph,
      elementOptions.text,
      prefixes,
      target,
    ],
  );

  // TODO: Just put variant on it's own prop.
  const variantClassName = variantNameToClassName(
    { prefixes },
    elementOptions.variant,
  );

  const baseAttributes = {
    className: compact([classNameProp, variantClassName]),
    style: {
      ...optionsStyle,
      styleProp,
    },
  };

  if (target === 'web') {
    return createElement(tagName, baseAttributes, children);
  }

  return createElement(
    tagName,
    {
      ...baseAttributes,
      ...encodeElementData({
        ...elementAttributes,
        elementType,
        contentOptions: {
          ...contentOptions,
          ...elementOptions.text,
          ...elementOptions.paragraph,
        },
        // TODO: Separate these.
        elementOptions: {
          ...elementOptions,
          ...contentOptions,
        },
      } as ElementData),
    },
    children,
  );
}
