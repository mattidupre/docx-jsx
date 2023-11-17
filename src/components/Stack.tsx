import { type ReactNode, type ReactElement, Fragment } from 'react';
import { dataToHtmlAttributes } from 'src/entities/tree';
import { type StackOptions } from 'src/entities/elements';
import { LAYOUT_TYPES, type LayoutPartial } from 'src/entities/primitives';

export type StackProps = StackOptions<false | ReactElement> & {
  children: ReactNode;
};

export function Stack({ children, layouts, margin }: StackProps) {
  const encodedElements: {
    header: Array<ReactNode>;
    footer: Array<ReactNode>;
  } = {
    header: [],
    footer: [],
  };
  const content: Array<ReactElement> = [
    <Fragment key="content">{children}</Fragment>,
  ];

  const stackOptions: StackOptions<boolean> = {
    margin,
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
              {...dataToHtmlAttributes({
                elementType,
                options: { layoutType },
              })}
            >
              {element}
            </div>,
          );
        }
      }
    }
  }

  return (
    <div
      {...dataToHtmlAttributes({ elementType: 'stack', options: stackOptions })}
    >
      {[...encodedElements.header, ...content, ...encodedElements.footer]}
    </div>
  );
}
