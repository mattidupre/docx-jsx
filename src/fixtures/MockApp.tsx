import { mockDocument } from './mockDocument';
import { reactToDocumentRoot } from 'src/lib/reactToDocumentRoot';
import { documentRootToDom } from 'src/lib/documentRootToDom';

const rootEl = document.getElementById('root')!;

// ReactDOM.createRoot(reactEl).render(
//   <React.StrictMode>{mockDocument}</React.StrictMode>,
// );

const documentRoot = await reactToDocumentRoot(mockDocument);
const previewEl = await documentRootToDom(documentRoot);
rootEl.appendChild(previewEl);
