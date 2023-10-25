import { htmlRenderer } from 'src/entities';
import { reactParser } from 'src/lib/reactParser';
import { createRenderer } from 'src/lib/createRenderer';

export const renderDocumentToPreview = createRenderer({
  parser: reactParser,
  renderer: htmlRenderer,
});
