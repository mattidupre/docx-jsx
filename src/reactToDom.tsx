import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { htmlToDom, type HtmlToDomOptions } from './lib/htmlToDom.js';
import { EnvironmentProvider } from './react/EnvironmentProvider.js';

export type ReactToDomOptions = HtmlToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: HtmlToDomOptions,
) =>
  htmlToDom(
    renderToStaticMarkup(
      <EnvironmentProvider documentType="pdf">
        {rootElement}
      </EnvironmentProvider>,
    ),
    options,
  );
