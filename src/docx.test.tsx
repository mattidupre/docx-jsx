/* eslint-disable react/jsx-no-useless-fragment */
import { test } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createContext } from './lib/context';
import { DocumentContextProvider } from './lib/documentContext';
import { useMemo } from './lib/useMemo';
import { fileURLToPath } from 'url';
import { renderToDocX } from './lib/renderToDocX';
import { TextRun, Paragraph, Section } from './components/docXPrimitives';
import DX from '.';
import mammoth from 'mammoth';

const dirname = fileURLToPath(new URL('.', import.meta.url));

const MockContext = createContext({ foo: 'default' });

const ComponentB = function (): JSX.Element {
  return (
    <>
      <DocumentContextProvider options={{ color: 'blue' }}>
        <Paragraph>
          <TextRun>COMPONENT 1</TextRun>
          <TextRun>{0}</TextRun>
        </Paragraph>
        <Paragraph>EXTRA</Paragraph>
      </DocumentContextProvider>
    </>
  );
};

const ComponentA = function (): JSX.Element {
  const providerValue = useMemo(() => ({ foo: 'baz' }), []);
  return (
    <MockContext.Provider value={providerValue}>
      <Section>
        <Paragraph>NO TEXTRUN</Paragraph>
        <Paragraph text="WEIRD" />
        <ComponentB />
        <Paragraph text="WEIRD" />
        <Paragraph>
          <TextRun>THREE</TextRun>
        </Paragraph>
        {/* <ComponentB /> */}
      </Section>
    </MockContext.Provider>
  );
};

test('renders to DocX', async () => {
  const buffer = await renderToDocX(
    <MockContext.Provider value={{ foo: 'bar' }}>
      <ComponentA />
    </MockContext.Provider>,
  );

  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);

  const { value } = await mammoth.extractRawText({ buffer });

  console.log(JSON.stringify(value));
});
