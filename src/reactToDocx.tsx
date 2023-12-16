import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Packer } from 'docx';
import { htmlToDocx } from './lib/htmlToDocx.js';
import { EnvironmentProvider } from './react/EnvironmentProvider.js';

export type ReactToDocxOptions = Record<string, never>;

export const reactToDocx = async (
  rootElement: ReactElement,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: ReactToDocxOptions,
) => {
  const html = renderToStaticMarkup(
    <EnvironmentProvider options={{ target: 'docx' }}>
      {rootElement}
    </EnvironmentProvider>,
  );
  const docx = htmlToDocx(html);
  return Packer.toBuffer(docx);
};
