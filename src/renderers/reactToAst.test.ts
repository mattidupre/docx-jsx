import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToAst } from './reactToAst';
import { it } from 'vitest';

it('renders without erroring', async () => {
  const result = await reactToAst(mockDocument);
});
