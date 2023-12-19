import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Packer } from 'docx';
import { htmlToDocx } from './lib/htmlToDocx.js';
import { EnvironmentProvider } from './react/EnvironmentProvider.js';

export const reactToDocx = async (rootElement: ReactElement) => {
  const html = renderToStaticMarkup(
    <EnvironmentProvider documentType="docx">
      {rootElement}
    </EnvironmentProvider>,
  );
  const docx = htmlToDocx(html);
  return Packer.toBuffer(docx);
};
