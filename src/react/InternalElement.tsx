import { type ReactNode, createElement, useMemo } from 'react';
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
import { useTarget } from './useTarget.js';

type InternalElementProps = ElementData &
  ExtendableProps & {
    children: ReactNode;
    tagName: TagName;
  };

export function InternalElement({
  elementType,
  elementOptions,
  tagName,
  className,
  style,
  children,
}: InternalElementProps) {
  const target = useTarget();

  const mergedStyle = useMemo(
    () =>
      target === 'web'
        ? {
            ...('text' in elementOptions &&
              textOptionsToCssVars(elementOptions as TextOptions)),
            ...('paragraph' in elementOptions &&
              paragraphOptionsToCssVars(
                elementOptions.paragraph as ParagraphOptions,
              )),
            ...style,
          }
        : undefined,
    [elementOptions, style, target],
  );

  if (useTarget() === 'web') {
    return createElement(
      tagName,
      {
        className,
        style: mergedStyle,
      },
      children,
    );
  }

  return createElement(
    tagName,
    encodeElementData({ elementType, elementOptions } as ElementData),
    children,
  );
}
