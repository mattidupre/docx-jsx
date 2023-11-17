import { StrictMode } from 'react';
import { mockDocument } from './mockDocument';
import { reactToDocumentRoot } from 'src/lib/reactToDocumentRoot';
import { documentRootToDom } from 'src/lib/documentRootToDom';

const rootEl = document.getElementById('root')!;

const documentRoot = await reactToDocumentRoot(
  <StrictMode>{mockDocument}</StrictMode>,
);

const previewEl = await documentRootToDom(documentRoot, {
  pageClassName: 'mock_page',
});
rootEl.appendChild(previewEl);
