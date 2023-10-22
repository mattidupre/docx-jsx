import { createRenderer } from 'src/lib/renderer';
import { createPager } from 'src/lib/pager';
import { type ReactNode } from 'react';
import { parseOptionsToHtml } from 'src/lib/parse';

const renderToHtml = createRenderer(parseOptionsToHtml);

export const renderToPreview = (documentNode: ReactNode) => {
  const { pagesGroups } = renderToHtml(documentNode);
  console.log(pagesGroups);
  // createPager is called here.
};
