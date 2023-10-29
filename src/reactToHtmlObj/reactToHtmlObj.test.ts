import { mockDoc } from 'src/mocks';
import { reactToHtmlObj } from './reactToHtmlObj';
import { it } from 'vitest';

it('renders', async () => {
  const htmlObj = await reactToHtmlObj(mockDoc);
  console.log(JSON.stringify(htmlObj, null, 2));
});
