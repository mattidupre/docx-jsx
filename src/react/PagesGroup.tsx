import { createElement, Children } from 'react';
import { useIsDocX, useState } from 'src/react';
import { type ElementProps, encodeHtmlDataAttributes } from 'src/entities';

const useGuid = () => useState(() => `id_${Math.random()}`)[0];

export function PagesGroup<TProps extends ElementProps['pagesGroup']>({
  children,
  pageTypes,
  ...options
}: TProps) {
  const pagesGroupId = useGuid();

  const parsedOptions = {
    ...options,
    pageTypes,
    id: pagesGroupId,
  };

  if (useIsDocX()) {
    return createElement(
      'pagesGroup' as any,
      parsedOptions,
      ...Children.toArray(children),
    );
  }

  return (
    <div
      {...encodeHtmlDataAttributes({ elementType: 'pagesGroup', pagesGroupId })}
    >
      <>
        {Object.entries(pageTypes).flatMap(([pageType, pageTypeOptions]) =>
          (['header', 'footer'] as const).map(
            (elementType) =>
              pageTypeOptions[elementType] &&
              createElement(
                elementType,
                {
                  key: `${pagesGroupId}_${pageType}_${elementType}`,
                  ...encodeHtmlDataAttributes({ elementType, pageType }),
                },
                ...Children.toArray(pageTypeOptions[elementType]),
              ),
          ),
        )}
        {children}
      </>
    </div>
  );
}
