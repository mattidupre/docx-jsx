import { type ReactNode, type ReactElement, Fragment } from 'react';
import { elementDataToAttributes, type ElementData } from 'src/entities/tree';
import {
  type PageType,
  type PageMargins,
  mapPageTypes,
} from 'src/entities/options';
import { useState } from 'react';
import { cloneDeep, merge } from 'lodash';

// Unique ID is temporarily needed by HTML to PDF converter.
let counter = 0;
const useGuid = () => useState(() => `id_${counter++}`)[0];

type PageOptions = {
  margins?: Partial<PageMargins>;
  header?: false | string | ReactElement;
  footer?: false | string | ReactElement;
};

export type PageGroupProps = {
  children: ReactNode;
  pages: Partial<Record<PageType, PageOptions>>;
};

const DEFAULT_PAGE_GROUP: ElementData<'pagegroup'>['pages'][PageType] = {
  margins: {},
  disableHeader: false,
  disableFooter: false,
};

export function PageGroup({ children, pages: pagesProp }: PageGroupProps) {
  const headers: Array<ReactNode> = [];
  const footers: Array<ReactNode> = [];
  const content: Array<ReactNode> = [
    <Fragment key="content">{children}</Fragment>,
  ];
  const pageGroupId = useGuid();

  const pages = mapPageTypes((pageType) => {
    const { margins, header, footer } = pagesProp?.[pageType] ?? {};

    const page: ElementData<'pagegroup'>['pages'][PageType] = merge(
      {},
      DEFAULT_PAGE_GROUP,
      {
        margins,
        disableHeader: header === false,
        disableFooter: footer === false,
      },
    );

    if (header) {
      headers.push(
        <div
          key={`${pageType}_header`}
          {...elementDataToAttributes('header', { pageType })}
        >
          {header}
        </div>,
      );
    }

    if (footer) {
      headers.push(
        <div
          key={`${pageType}_footer`}
          {...elementDataToAttributes('footer', { pageType })}
        >
          {footer}
        </div>,
      );
    }

    return page;
  });

  return (
    <div {...elementDataToAttributes('pagegroup', { pageGroupId, pages })}>
      {[...headers, ...content, ...footers]}
    </div>
  );
}
