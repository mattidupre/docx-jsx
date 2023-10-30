import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToHtmlObj } from './reactToHtmlObj';
import { it } from 'vitest';

it('renders without erroring', async () => {
  const htmlObj = await reactToHtmlObj(mockDocument);
});
