import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Packer } from 'docx';
import { htmlToDocx, type HtmlToDocxOptions } from './lib/docx';
import { InternalEnvironmentProvider } from './reactComponents/InternalEnvironmentProvider';

export const reactToDocx = async (
  rootElement: ReactElement,
  options: HtmlToDocxOptions,
) => {
  const html = renderToStaticMarkup(
    <InternalEnvironmentProvider documentType="docx">
      {rootElement}
    </InternalEnvironmentProvider>,
  );
  const docx = await htmlToDocx(html, options);
  return Packer.toBuffer(docx);
};
