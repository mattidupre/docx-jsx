import { type ReactNode, type ReactElement } from 'react';
import { encodeElementData, type StackOptions } from '../entities';
import {
  LayoutOptions,
  StackConfig,
  assignStackOptions,
  mapLayoutKeys,
} from '../entities/options.js';
import { omit } from 'lodash-es';

export type StackProps = StackOptions & {
  className?: string;
  layouts: LayoutOptions<ReactNode>;
  children: ReactNode;
};

export function Stack({
  children,
  className,
  layouts,
  ...options
}: StackProps) {
  const encodedElements: {
    header: Array<ReactNode>;
    footer: Array<ReactNode>;
  } = {
    header: [],
    footer: [],
  };

  const stackOptions = omit(assignStackOptions({}, options), [
    'layouts',
  ]) as StackConfig;

  mapLayoutKeys((layoutType, elementType) => {
    const element = layouts?.[layoutType]?.[elementType];
    if (element) {
      encodedElements[elementType].push(
        <div
          key={`${layoutType}_${elementType}`}
          {...encodeElementData({
            elementType,
            elementOptions: { layoutType },
          })}
        >
          {element}
        </div>,
      );
    }
  });

  // TODO: Don't use an array.
  const contentElement: Array<ReactElement> = [
    <div
      key="content"
      className={className}
      {...encodeElementData({
        elementType: 'content',
        elementOptions: {},
      })}
    >
      {children}
    </div>,
  ];

  return (
    <div
      {...encodeElementData({
        elementType: 'stack',
        elementOptions: stackOptions,
      })}
    >
      {[...encodedElements.header, contentElement, ...encodedElements.footer]}
    </div>
  );
}
