import { test } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Document, Section, Paragraph, TextRun } from './lib/components';
import { TextProvider, useTextConfig } from './lib/context';
import {
  renderToDocXXml,
  renderToDocXBuffer,
  renderToHtml,
} from './lib/render';
import { fileURLToPath } from 'url';
import xmlFormat from 'xml-formatter';

const dirname = fileURLToPath(new URL('.', import.meta.url));

const ComponentD = function (): null | JSX.Element {
  return (
    <>
      <TextRun>Component D 1</TextRun>
      <TextRun>Component D 2</TextRun>
    </>
  );
};

const ComponentC = function (): null | JSX.Element {
  console.log(useTextConfig().color.toUpperCase());
  return null;
};

const ComponentB = function (): null | JSX.Element {
  return (
    <>
      <ComponentC />
      <TextProvider options={{ color: 'red' }}>
        <Paragraph>
          <ComponentC />
          <TextRun>COMPONENT 1</TextRun>
          <TextRun>{0}</TextRun>
        </Paragraph>
        <Paragraph>EXTRA</Paragraph>
      </TextProvider>
    </>
  );
};

const ComponentA = function (): null | JSX.Element {
  return (
    <>
      <Paragraph>NO TEXTRUN</Paragraph>
      <Paragraph text="WEIRD" />
      <ComponentB />
      <Paragraph text="WEIRD" />
      <Paragraph>
        <TextRun>THREE</TextRun>
      </Paragraph>
      {/* <ComponentB /> */}
    </>
  );
};

const jsx = (
  <Document>
    <Section>
      <ComponentA />
    </Section>
  </Document>
);

// test('render to docx xml', async () => {
//   const str = xmlFormat(await renderToDocXXml(jsx));
//   console.log(str);
// });

test('render to docx buffer', async () => {
  const buffer = await renderToDocXBuffer(jsx);
  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);
});

test('render to html', async () => {
  console.log(renderToHtml(jsx));
});
