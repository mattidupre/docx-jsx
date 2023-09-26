import { renderToStaticMarkup } from 'react-dom/server';
import { type ReactElement } from 'react';

export const renderHtml = (node: ReactElement): string => {
  return renderToStaticMarkup(node);
};
