import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import type { Browser } from 'puppeteer-core';
import { reactToPdf } from '../reactToPdf';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import { reactToHtmlDocument } from '../reactToHtmlDocument';
import { reactToDocx } from '../reactToDocx';
import type { DocumentRootComponent } from '../lib/reactToHtml';
import {
  isErrorObject,
  stringifyErrorObject,
  type ErrorObject,
} from '../utils/error';

export type DemoTarget = 'html' | 'docx' | 'dotx' | 'pdf';

export type DemoBuildResult = {
  baseName: string;
  target: DemoTarget;
  filePath: string;
  /** Size of the written file, or `0` when nothing was written. */
  byteLength: number;
  /** The renderer's failure message, or `undefined` on success. */
  error: undefined | string;
};

type Renderer = (
  DocumentRoot: DocumentRootComponent,
) => Promise<string | Uint8Array | ErrorObject>;

const createRenderers = (browser: Browser): Record<DemoTarget, Renderer> => ({
  html: (DocumentRoot) => reactToHtmlDocument(DocumentRoot),
  docx: (DocumentRoot) => reactToDocx(DocumentRoot, { fonts: {} }),
  dotx: (DocumentRoot) =>
    reactToDocx(DocumentRoot, { fonts: {}, fileType: 'dotx' }),
  pdf: (DocumentRoot) => reactToPdf(DocumentRoot, { browser }),
});

const currentFilePath = url.fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

export const build = async ({ silent }: { silent?: boolean } = {}): Promise<
  ReadonlyArray<DemoBuildResult>
> => {
  const log = silent ? () => {} : console.info;

  log('Build starting...');

  const browser = await launchTestBrowser();
  try {
    const renderers = createRenderers(browser);

    const fileNames = (await fs.readdir(currentDir, { withFileTypes: true }))
      .filter(
        (fileObj) =>
          fileObj.isFile() && !currentFilePath.endsWith(fileObj.name),
      )
      .map(({ name }) => name);

    const outDir = path.join(process.cwd(), 'dist-demo');
    await fs.mkdir(outDir, { recursive: true });

    const results = await Promise.all(
      fileNames.flatMap((fileName) => {
        const baseName = path.basename(fileName, path.extname(fileName));

        return (['html', 'docx', 'pdf'] as const).map(
          async (target): Promise<DemoBuildResult> => {
            const filePath = path.join(outDir, `${baseName}.${target}`);
            const result: DemoBuildResult = {
              baseName,
              target,
              filePath,
              byteLength: 0,
              error: undefined,
            };

            log(`Building ${baseName} to ${target.toUpperCase()}...`);
            try {
              const {
                Document,
                wordFileType,
              }: {
                Document: DocumentRootComponent;
                wordFileType?: 'docx' | 'dotx';
              } = await import(path.join(currentDir, fileName));
              result.target =
                target === 'docx' ? (wordFileType ?? 'docx') : target;
              result.filePath = path.join(
                outDir,
                `${baseName}.${result.target}`,
              );
              const rendered = await renderers[result.target](Document);
              if (isErrorObject(rendered)) {
                result.error = stringifyErrorObject(rendered);
              } else {
                await fs.writeFile(result.filePath, rendered, {
                  encoding: 'utf-8',
                });
                result.byteLength = (await fs.stat(result.filePath)).size;
              }
            } catch (error) {
              result.error = String(
                error instanceof Error ? error.message : error,
              );
            }

            log(
              result.error
                ? `Building ${baseName} to ${result.target.toUpperCase()} encountered an error: ${result.error}`
                : `Building ${baseName} to ${result.target.toUpperCase()} complete.`,
            );
            return result;
          },
        );
      }),
    );

    log('Build complete');

    return results;
  } finally {
    await closeTestBrowser(browser);
  }
};
