import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { type DocumentRootToPdfOptions, htmlToPdf } from './lib/htmlToPdf.js';
import { EnvironmentProvider } from './react/EnvironmentProvider.js';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(
    renderToStaticMarkup(
      <EnvironmentProvider options={{ target: 'pdf' }}>
        {rootElement}
      </EnvironmentProvider>,
    ),
    options,
  );
};
