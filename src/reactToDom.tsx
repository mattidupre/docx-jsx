import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { htmlToDom, type HtmlToDomOptions } from './lib/htmlToDom.js';
import { InternalEnvironmentProvider } from './react/InternalEnvironmentProvider.js';

export type ReactToDomOptions = HtmlToDomOptions;

export const reactToDom = async (
  DocumentRoot: () => ReactElement,
  options: HtmlToDomOptions,
) => {
  return htmlToDom(
    renderToStaticMarkup(
      <InternalEnvironmentProvider documentType="pdf">
        <DocumentRoot />
      </InternalEnvironmentProvider>,
    ),
    options,
  );
};
