import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { type HtmlToPdfOptions, htmlToPdf } from './lib/htmlToPdf.js';
import { EnvironmentProvider } from './react/EnvironmentProvider.js';

export type ReactToPdfOptions = HtmlToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(
    renderToStaticMarkup(
      <EnvironmentProvider documentType="pdf">
        {rootElement}
      </EnvironmentProvider>,
    ),
    options,
  );
};
