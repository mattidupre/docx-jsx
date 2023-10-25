import { astRenderer } from 'src/entities';
import { reactParser } from 'src/lib/reactParser';
import { createRenderer } from 'src/lib/createRenderer';

export const renderDocumentToAst = createRenderer({
  parser: reactParser,
  renderer: astRenderer,
});
