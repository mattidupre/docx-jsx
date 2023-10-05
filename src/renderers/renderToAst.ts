import { createRenderer } from 'src/render';
import { createParser } from 'src/parse';

export const renderDocumentToAst = createRenderer(
  'document',
  createParser('ast'),
);
