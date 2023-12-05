import { type ReactNode, type ReactElement, Fragment } from 'react';
import { encodeElementData, type StackOptions } from '../entities';
import { LAYOUT_TYPES, type LayoutPartial } from '../entities/options.js';

export type StackProps = StackOptions<false | ReactElement> & {
  children: ReactNode;
};

export function Stack({ children, layouts, ...options }: StackProps) {
  const encodedElements: {
    header: Array<ReactNode>;
    footer: Array<ReactNode>;
  } = {
    header: [],
    footer: [],
  };

  const stackOptions: StackOptions<never> = {
    ...options,
  };
  if (layouts) {
    stackOptions.layouts = {};
    for (const layoutType of LAYOUT_TYPES) {
      const layoutProp = layouts[layoutType];
      if (!layoutProp) {
        stackOptions.layouts[layoutType] = layoutProp;
        continue;
      }

      const layoutWithoutElements: LayoutPartial<true> = {};
      stackOptions.layouts[layoutType] = layoutWithoutElements;

      for (const elementType of ['header', 'footer'] as const) {
        const element = layoutProp[elementType];
        if (element) {
          layoutWithoutElements[elementType] = true;
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
      }
    }
  }

  const contentElement: Array<ReactElement> = [
    <div
      key="content"
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
