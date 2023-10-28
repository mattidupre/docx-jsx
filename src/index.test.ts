import { TypeRegistry, FormatRegistry } from '@sinclair/typebox';
import { mockDocumentElement } from 'src/mocks';
import {
  renderDocumentToDocxXml,
  renderDocumentToAst,
  renderDocumentToDocxBuffer,
  renderToPdf,
  jsxToDocumentOptions,
  reactToDocumentOptions,
} from 'src/renderers';
import { test, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';
import puppeteer, { type Browser } from 'puppeteer';

const distPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../dist-test',
);

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ dumpio: true, headless: 'new' });
  if (!existsSync(distPath)) {
    await fs.mkdir(distPath);
  }
});
afterAll(async () => {
  await browser.close();
});

test('renders to ast', () => {
  const ast = renderDocumentToAst(mockDocumentElement);
  // console.log(JSON.stringify(ast, null, 2));
});

test('renders to xml', async () => {
  const xml = await renderDocumentToDocxXml(mockDocumentElement);
  // console.log(xml);
});

test('renders to docx', async () => {
  const buffer = await renderDocumentToDocxBuffer(mockDocumentElement);
  await fs.writeFile(path.join(distPath, 'test-docx.docx'), buffer);
});

test('JSX renderer', async () => {
  const documentOptions = jsxToDocumentOptions(mockDocumentElement);
  const buffer = await renderToPdf(browser, documentOptions);
  await fs.writeFile(path.join(distPath, 'test-jsx.pdf'), buffer);
});

test('React renderer', async () => {
  const documentOptions = reactToDocumentOptions(mockDocumentElement);
  const buffer = await renderToPdf(browser, documentOptions);
  await fs.writeFile(path.join(distPath, 'test-react.pdf'), buffer);
}, 10000);
