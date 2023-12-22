import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Packer } from 'docx';
import { htmlToDocx } from './lib/htmlToDocx';
import { InternalEnvironmentProvider } from './reactComponents/InternalEnvironmentProvider';

export const reactToDocx = async (rootElement: ReactElement) => {
  const html = renderToStaticMarkup(
    <InternalEnvironmentProvider documentType="docx">
      {rootElement}
    </InternalEnvironmentProvider>,
  );
  const docx = htmlToDocx(html);
  return Packer.toBuffer(docx);
};
