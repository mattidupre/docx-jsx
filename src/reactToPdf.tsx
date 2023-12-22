import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { type HtmlToPdfOptions, htmlToPdf } from './lib/htmlToPdf';
import { InternalEnvironmentProvider } from './reactComponents/InternalEnvironmentProvider';

export type ReactToPdfOptions = HtmlToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(
    renderToStaticMarkup(
      <InternalEnvironmentProvider documentType="pdf">
        {rootElement}
      </InternalEnvironmentProvider>,
    ),
    options,
  );
};
