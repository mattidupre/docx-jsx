import React from 'react';
import ReactDOM from 'react-dom/client';
import { mockDocument } from './mockDocument';
import { treeToDocument } from 'src/renderers/treeToDocument';
import { treeToMarkup } from 'src/renderers/treeToMarkup';
import { documentToDom } from 'src/renderers/documentToDom';
import { reactToTree } from 'src/utils';

const rootEl = document.getElementById('root')!;

// ReactDOM.createRoot(reactEl).render(
//   <React.StrictMode>{mockDocument}</React.StrictMode>,
// );

const tree = await reactToTree(mockDocument);
const doc = treeToDocument(tree);
const previewEl = await documentToDom(doc);
rootEl.appendChild(previewEl);
