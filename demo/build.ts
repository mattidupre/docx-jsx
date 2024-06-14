import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { reactToPdf } from '../src/reactToPdf';
import { PUPPETEER_OPTIONS } from '../src/fixtures/puppeteerOptions';
import { reactToHtmlDocument } from '../src/reactToHtmlDocument';
import { reactToDocx } from '../src/reactToDocx';
import { DocumentRootComponent } from '../src/lib/reactToHtml';

const renderers: Record<
  string,
  (DocumentRoot: DocumentRootComponent) => Promise<string | Buffer>
> = {
  html: (DocumentRoot) => reactToHtmlDocument(DocumentRoot),
  docx: (DocumentRoot) => reactToDocx(DocumentRoot, { fonts: {} }),
  pdf: (DocumentRoot) =>
    reactToPdf(DocumentRoot, {
      puppeteer: PUPPETEER_OPTIONS,
    }),
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
          await fs.writeFile(
            path.join(outDir, `${baseName}.${documentType}`),
            await render(Document),
            {
              encoding: 'utf-8',
            },
          );
          log(
            `Building ${baseName} to ${documentType.toUpperCase()} complete.`,
          );
        }),
      );
    }),
  );

  log('Build complete');
};
