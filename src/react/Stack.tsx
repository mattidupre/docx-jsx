import { type ReactNode, type ReactElement, useMemo } from 'react';
import { omit } from 'lodash-es';
import { encodeElementData, type StackOptions } from '../entities';
import {
  type LayoutOptions,
  type StackConfig,
  assignStackOptions,
  mapLayoutKeys,
} from '../entities/options.js';
import { ReactStackContext } from './entities';

export type StackProps = StackOptions & {
  className?: string;
  layouts: LayoutOptions<ReactNode>;
  children: ReactNode;
};

// TODO: If target is web, use a fragment.

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

  const stackConfig = useMemo(
    () => omit(assignStackOptions({}, options), ['layouts']) as StackConfig,
    [options],
  );

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
    <ReactStackContext.Provider value={stackConfig}>
      <div
        {...encodeElementData({
          elementType: 'stack',
          elementOptions: stackConfig,
        })}
      >
        {[...encodedElements.header, contentElement, ...encodedElements.footer]}
      </div>
    </ReactStackContext.Provider>
  );
}
