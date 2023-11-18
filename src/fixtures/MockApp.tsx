import { StrictMode } from 'react';
import { mockDocument } from './mockDocument.js';
import { reactToDocumentRoot } from '../lib/reactToDocumentRoot/index.js';
import { documentRootToDom } from '../lib/documentRootToDom/index.js';

const rootEl = document.getElementById('root')!;

const documentRoot = await reactToDocumentRoot(
  <StrictMode>{mockDocument}</StrictMode>,
);

const previewEl = await documentRootToDom(documentRoot, {
  pageClassName: 'mock_page',
});
rootEl.appendChild(previewEl);
