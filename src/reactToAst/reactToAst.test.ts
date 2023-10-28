import { Mock } from './Mock';
import { mockDocumentElement } from 'src/mocks';
import { reactToAst } from './reactToAst';
import { it } from 'vitest';
import { toHtml } from 'hast-util-to-html';

it('renders', async () => {
  const result = await reactToAst(mockDocumentElement);
  console.log(toHtml(result));
});
