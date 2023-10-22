import { createRenderer } from 'src/lib/renderer';
import { parseOptionsToAst } from 'src/lib/parse';

export const renderDocumentToAst = createRenderer(parseOptionsToAst);
