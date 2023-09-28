import { renderToStaticMarkup } from 'react-dom/server';
import { type ReactElement } from 'react';

export const renderToHtml = (node: ReactElement): string => {
  return renderToStaticMarkup(node);
};
