import { renderToStaticMarkup } from 'react-dom/server';
import { ReactElement } from 'react';
import { Packer } from 'docx';
import { htmlToDocx } from './lib/htmlToDocx.js';

export type ReactToDocxOptions = {};

export const reactToDocx = async (
  rootElement: ReactElement,
  options: ReactToDocxOptions,
) => {
  const html = renderToStaticMarkup(rootElement);
  const docx = htmlToDocx(html);
  return Packer.toBuffer(docx);
};
