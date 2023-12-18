import { type ReactNode, createElement, useMemo, useContext } from 'react';
import { compact } from 'lodash-es';
import {
  encodeElementData,
  paragraphOptionsToCssVars,
  textOptionsToCssVars,
} from '../entities';
import type {
  ElementData,
  ParagraphOptions,
  TagName,
  TextOptions,
} from '../entities';
import type { ExtendableProps } from './entities';
import { ReactDocumentContext } from './entities';
import { useTarget } from './useTarget.js';

type InternalElementProps = ElementData &
  ExtendableProps & {
    elementAttributes?: Record<string, unknown>;
    children?: ReactNode;
    tagName: TagName;
  };

export function InternalElement({
  elementType,
  elementOptions,
  elementAttributes,
  tagName,
  className: classNameProp,
  style: styleProp,
  children,
}: InternalElementProps) {
  const target = useTarget();

  const optionsStyle = useMemo(
    () => ({
      ...(target === 'web' && {
        ...('text' in elementOptions &&
          textOptionsToCssVars(elementOptions.text as TextOptions)),
        ...('paragraph' in elementOptions &&
          paragraphOptionsToCssVars(
            elementOptions.paragraph as ParagraphOptions,
          )),
      }),
    }),
    [elementOptions, target],
  );

  const { prefixes } = useContext(ReactDocumentContext)!;
  const variantClassName = prefixes.variantClassName + elementOptions.variant;

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
        elementOptions,
      } as ElementData),
    },
    children,
  );
}
