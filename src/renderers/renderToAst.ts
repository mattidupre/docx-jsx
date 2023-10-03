import { render } from 'src/entities';

type DocumentEl = JSX.Element;

export const renderDocumentToAst = (documentEl: DocumentEl) =>
  render(documentEl, 'ast');
