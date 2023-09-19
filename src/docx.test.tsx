import { test } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';
import { renderToDocX } from './lib/renderToDocX';
import { TextRun, Paragraph } from './lib/docXPrimitives';
import { type Node } from './lib/entities';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DocXJSX } from './lib/namespace';
import mammoth from 'mammoth';

const dirname = fileURLToPath(new URL('.', import.meta.url));

const ComponentB = function (): Node {
  return <TextRun>NESTED</TextRun>;
};

const ComponentA = function (): Node {
  return (
    <>
      <Paragraph>NO TEXTRUN</Paragraph>
      <Paragraph text="WEIRD" />
      <TextRun>{0}</TextRun>
      <Paragraph text="WEIRD" />
      <Paragraph>
        <TextRun>THREE</TextRun>
      </Paragraph>
      <ComponentB />
    </>
  );
};

test('renders without error', async () => {
  const buffer = await renderToDocX(<ComponentA />);

  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);

  const { value } = await mammoth.extractRawText({ buffer });

  console.log(JSON.stringify(value));
});
