import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import puppeteer from 'puppeteer-core';
import { reactToPdf } from '../reactToPdf';
import { PUPPETEER_OPTIONS } from '../fixtures/puppeteerOptions';
import { reactToHtmlDocument } from '../reactToHtmlDocument';
import { reactToDocx } from '../reactToDocx';
import type { DocumentRootComponent } from '../lib/reactToHtml';
import {
  isErrorObject,
  stringifyErrorObject,
  type ErrorObject,
} from '../utils/error';

const browser = await puppeteer.launch(PUPPETEER_OPTIONS);

const renderers: Record<
  string,
  (
    DocumentRoot: DocumentRootComponent,
  ) => Promise<string | Uint8Array | ErrorObject>
> = {
  html: (DocumentRoot) => reactToHtmlDocument(DocumentRoot),
  docx: (DocumentRoot) => reactToDocx(DocumentRoot, { fonts: {} }),
  pdf: (DocumentRoot) => reactToPdf(DocumentRoot, { browser }),
};

const currentFilePath = url.fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

export const build = async ({ silent }: { silent?: boolean } = {}) => {
  const log = silent ? () => {} : console.info;

  log('Build starting...');

  const fileNames = (await fs.readdir(currentDir, { withFileTypes: true }))
    .filter(
      (fileObj) => fileObj.isFile() && !currentFilePath.endsWith(fileObj.name),
    )
    .map(({ name }) => name);

  const outDir = path.join(process.cwd(), 'dist-demo');
  await fs.mkdir(outDir, { recursive: true });

  await Promise.all(
    fileNames.map(async (fileName) => {
      const baseName = path.basename(fileName, path.extname(fileName));
      const { Document } = await import(path.join(currentDir, fileName));

      await Promise.all(
        Object.entries(renderers).map(async ([documentType, render]) => {
          log(`Building ${baseName} to ${documentType.toUpperCase()}...`);
          const result = await render(Document);
          if (isErrorObject(result)) {
            log(
              `Building ${baseName} to ${documentType.toUpperCase()} encountered an error: ${stringifyErrorObject(result)}`,
            );
          } else {
            await fs.writeFile(
              path.join(outDir, `${baseName}.${documentType}`),
              result,
              {
                encoding: 'utf-8',
              },
            );
            log(
              `Building ${baseName} to ${documentType.toUpperCase()} complete.`,
            );
          }
        }),
      );
    }),
  );

  log('Build complete');
};
