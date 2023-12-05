import { StrictMode } from 'react';
import { mockDocument } from './mockDocument.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToTree } from '../lib/htmlToTree/index.js';

import { documentRootToDom } from '../lib/treeToDom/index.js';

const rootEl = document.getElementById('root')!;

const documentTree = htmlToTree(
  renderToStaticMarkup(<StrictMode>{mockDocument}</StrictMode>),
);

const previewEl = await documentRootToDom(documentTree, {
  pageClassName: 'mock_page',
});
rootEl.appendChild(previewEl);
