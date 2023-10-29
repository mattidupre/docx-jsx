import { type ElementProps, encodeHtmlDataAttributes } from 'src/entities';
import { useState, createElement, Children } from 'react';

const useGuid = () => useState(() => `id_${Math.random()}`)[0];

export function PageGroup<TProps extends ElementProps['pagegroup']>({
  children,
  pageTypes,
}: TProps) {
  const pageGroupId = useGuid();
  return (
    <div
      {...encodeHtmlDataAttributes({ elementType: 'pagegroup', pageGroupId })}
    >
      <>
        {Object.entries(pageTypes).flatMap(([pageType, pageTypeOptions]) =>
          (['header', 'footer'] as const).map(
            (elementType) =>
              pageTypeOptions[elementType] &&
              createElement(
                elementType,
                {
                  key: `${pageGroupId}_${pageType}_${elementType}`,
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
