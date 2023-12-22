import { type ReactNode, useMemo } from 'react';
import { omit } from 'lodash';
import type { StackOptions } from '../entities';
import {
  type LayoutOptions,
  type StackConfig,
  assignStackOptions,
  mapLayoutKeys,
} from '../entities/options';
import { ReactStackContext } from './entities';
import { InternalElement } from './InternalElement';

export type StackProps = StackOptions & {
  layouts: LayoutOptions<ReactNode>;
  children: ReactNode;
};

export function Stack({ children, layouts, ...options }: StackProps) {
  const stackConfig = useMemo(
    () => omit(assignStackOptions({}, options), ['layouts']) as StackConfig,
    [options],
  );

  const contentElement = (
    <InternalElement
      preferFragment
      key="content"
      tagName="div"
      elementType="content"
      elementOptions={{}}
    >
      {children}
    </InternalElement>
  );

  const headerFooterElements: {
    header: Array<ReactNode>;
    footer: Array<ReactNode>;
  } = {
    header: [],
    footer: [],
  };
  mapLayoutKeys((layoutType, elementType) => {
    const element = layouts?.[layoutType]?.[elementType];
    if (element) {
      headerFooterElements[elementType].push(
        <InternalElement
          key={`${layoutType}_${elementType}`}
          tagName="div"
          elementType={elementType}
          elementOptions={{ layoutType }}
        >
          {element}
        </InternalElement>,
      );
    }
  });

  return (
    <ReactStackContext.Provider value={stackConfig}>
      <InternalElement
        preferFragment
        tagName="div"
        elementType="stack"
        elementOptions={stackConfig}
      >
        {[
          ...headerFooterElements!.header,
          contentElement,
          ...headerFooterElements!.footer,
        ]}
      </InternalElement>
    </ReactStackContext.Provider>
  );
}
