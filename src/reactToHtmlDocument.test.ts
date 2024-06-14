import { it } from 'vitest';
import { reactToHtmlDocument } from './reactToHtmlDocument';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';

it('runs without error', async () => {
  await writeTestFile(
    'reactToHtmlDocument.html',
    await reactToHtmlDocument(MockDocument),
  );
});
