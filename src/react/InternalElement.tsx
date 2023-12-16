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
    elementAttributes?: Record<string, unknown>;
    children?: ReactNode;
    tagName: TagName;
  };

export function InternalElement({
  elementType,
  elementOptions,
  elementAttributes,
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
              textOptionsToCssVars(elementOptions.text as TextOptions)),
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
    encodeElementData({
      ...elementAttributes,
      elementType,
      elementOptions,
    } as ElementData),
    children,
  );
}
