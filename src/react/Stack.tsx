import { type ReactNode, useMemo } from 'react';
import { omit } from 'lodash-es';
import type { StackOptions } from '../entities';
import {
  type LayoutOptions,
  type StackConfig,
  assignStackOptions,
  mapLayoutKeys,
} from '../entities/options.js';
import { ReactStackContext } from './entities';
import { useTarget } from './useTarget';
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

  if (useTarget() === 'web') {
    return (
      <ReactStackContext.Provider value={stackConfig}>
        {children}
      </ReactStackContext.Provider>
    );
  }

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

  const contentElement = (
    <InternalElement
      key="content"
      tagName="div"
      elementType="content"
      elementOptions={{}}
    >
      {children}
    </InternalElement>
  );

  return (
    <ReactStackContext.Provider value={stackConfig}>
      <InternalElement
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
